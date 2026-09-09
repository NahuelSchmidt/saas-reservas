"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole, ForbiddenError } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { withTenant } from "@/lib/db/tenant-context";
import {
  enrollStudent,
  cancelEnrollment,
  registerClassPayment,
  ClassSessionFullError,
  AlreadyEnrolledError,
} from "@/lib/classes/service";
import { classEnrollmentSchema, registerClassPaymentSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

/** Instructor vinculado a la cuenta logueada para este tenant, o null si no hay ninguno. */
async function findMyInstructorId(tenantId: string, userId: string) {
  const instructor = await prisma.instructor.findFirst({ where: { tenantId, userId } });
  return instructor?.id ?? null;
}

/** Confirma que la sesión pedida es del instructor logueado antes de dejarlo operar sobre ella. */
async function assertOwnSession(tenantId: string, classSessionId: string, instructorId: string) {
  const session = await withTenant(tenantId, (tx) =>
    tx.classSession.findUnique({ where: { id: classSessionId }, select: { instructorId: true } }),
  );
  if (!session || session.instructorId !== instructorId) throw new ForbiddenError("Esa sesión no es tuya.");
}

/** Confirma que la inscripción pedida pertenece a una sesión del instructor logueado. */
async function assertOwnEnrollment(tenantId: string, enrollmentId: string, instructorId: string) {
  const enrollment = await withTenant(tenantId, (tx) =>
    tx.classEnrollment.findUnique({ where: { id: enrollmentId }, select: { classSession: { select: { instructorId: true } } } }),
  );
  if (!enrollment || enrollment.classSession.instructorId !== instructorId) throw new ForbiddenError("Esa inscripción no es tuya.");
}

export async function enrollStudentAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "INSTRUCTOR"]);
  const instructorId = await findMyInstructorId(tenant.id, actor.id);
  if (!instructorId) return { ok: false, error: "Tu cuenta no está vinculada a ningún instructor." };

  const classSessionId = formData.get("classSessionId");
  try {
    await assertOwnSession(tenant.id, String(classSessionId), instructorId);
  } catch {
    return { ok: false, error: "Esa sesión no es tuya." };
  }

  const parsed = classEnrollmentSchema.safeParse({
    classSessionId,
    studentName: formData.get("studentName"),
    studentPhone: formData.get("studentPhone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const enrollment = await enrollStudent(tenant.id, parsed.data);
    revalidatePath(`/${tenantSlug}/mis-clases`);
    return { ok: true, data: { id: enrollment.id } };
  } catch (err) {
    if (err instanceof ClassSessionFullError || err instanceof AlreadyEnrolledError) {
      return { ok: false, error: err.message };
    }
    console.error(err);
    return { ok: false, error: "No pudimos anotar al alumno." };
  }
}

export async function cancelEnrollmentAction(
  tenantSlug: string,
  enrollmentId: string,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "INSTRUCTOR"]);
  const instructorId = await findMyInstructorId(tenant.id, actor.id);
  if (!instructorId) return { ok: false, error: "Tu cuenta no está vinculada a ningún instructor." };

  try {
    await assertOwnEnrollment(tenant.id, enrollmentId, instructorId);
  } catch {
    return { ok: false, error: "Esa inscripción no es tuya." };
  }

  await cancelEnrollment(tenant.id, enrollmentId);
  revalidatePath(`/${tenantSlug}/mis-clases`);
  return { ok: true, data: { id: enrollmentId } };
}

export async function registerClassPaymentAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "INSTRUCTOR"]);
  const instructorId = await findMyInstructorId(tenant.id, actor.id);
  if (!instructorId) return { ok: false, error: "Tu cuenta no está vinculada a ningún instructor." };

  const parsed = registerClassPaymentSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    method: formData.get("method"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    await assertOwnEnrollment(tenant.id, parsed.data.enrollmentId, instructorId);
  } catch {
    return { ok: false, error: "Esa inscripción no es tuya." };
  }

  await registerClassPayment(tenant.id, parsed.data.enrollmentId, parsed.data.method);
  revalidatePath(`/${tenantSlug}/mis-clases`);
  return { ok: true, data: { id: parsed.data.enrollmentId } };
}
