"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import {
  createInstructor,
  updateInstructor,
  createClassType,
  updateClassType,
  createClassSession,
  cancelClassSession,
  enrollStudent,
  cancelEnrollment,
  registerClassPayment,
  ClassSessionFullError,
  CourtNotAvailableError,
  AlreadyEnrolledError,
} from "@/lib/classes/service";
import {
  instructorSchema,
  classTypeSchema,
  classSessionSchema,
  classEnrollmentSchema,
  registerClassPaymentSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

// ---------------------------------------------------------------------------
// Instructores
// ---------------------------------------------------------------------------

export async function createInstructorAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const userIdRaw = formData.get("userId");
  const parsed = instructorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    bio: formData.get("bio") || undefined,
    commissionPct: formData.get("commissionPct"),
    userId: userIdRaw && userIdRaw !== "EXTERNAL" ? userIdRaw : "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const instructor = await createInstructor(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: instructor.id } };
}

export async function updateInstructorAction(
  tenantSlug: string,
  instructorId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const userIdRaw = formData.get("userId");
  const activeRaw = formData.get("active");
  const parsed = instructorSchema.partial().safeParse({
    name: formData.get("name") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    bio: formData.get("bio") || undefined,
    commissionPct: formData.get("commissionPct"),
    userId: userIdRaw != null ? (userIdRaw === "EXTERNAL" ? "" : userIdRaw) : undefined,
    active: activeRaw != null ? activeRaw === "true" : undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await updateInstructor(tenant.id, instructorId, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: instructorId } };
}

// ---------------------------------------------------------------------------
// Tipos de clase
// ---------------------------------------------------------------------------

export async function createClassTypeAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = classTypeSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level") ?? "ANY",
    modality: formData.get("modality") ?? "GROUP",
    defaultDurationMinutes: formData.get("defaultDurationMinutes"),
    defaultCapacity: formData.get("defaultCapacity"),
    defaultPriceCents: Number(formData.get("defaultPriceARS")) * 100,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const classType = await createClassType(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: classType.id } };
}

export async function updateClassTypeAction(
  tenantSlug: string,
  classTypeId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const priceARS = formData.get("defaultPriceARS");
  const activeRaw = formData.get("active");
  const parsed = classTypeSchema.partial().safeParse({
    name: formData.get("name") || undefined,
    level: formData.get("level") || undefined,
    modality: formData.get("modality") || undefined,
    defaultDurationMinutes: formData.get("defaultDurationMinutes") || undefined,
    defaultCapacity: formData.get("defaultCapacity") || undefined,
    defaultPriceCents: priceARS ? Number(priceARS) * 100 : undefined,
    active: activeRaw != null ? activeRaw === "true" : undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await updateClassType(tenant.id, classTypeId, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: classTypeId } };
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

export async function createClassSessionAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const courtIdRaw = formData.get("courtId");
  const parsed = classSessionSchema.safeParse({
    classTypeId: formData.get("classTypeId"),
    instructorId: formData.get("instructorId"),
    courtId: courtIdRaw && courtIdRaw !== "NONE" ? courtIdRaw : "",
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    capacity: formData.get("capacity"),
    priceCents: Number(formData.get("priceARS")) * 100,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const session = await createClassSession(
      tenant.id,
      { ...parsed.data, courtId: parsed.data.courtId || undefined },
      actor.id,
    );
    revalidatePath(`/${tenantSlug}/admin/classes`);
    return { ok: true, data: { id: session.id } };
  } catch (err) {
    if (err instanceof CourtNotAvailableError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos crear la sesión." };
  }
}

export async function cancelClassSessionAction(
  tenantSlug: string,
  classSessionId: string,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await cancelClassSession(tenant.id, classSessionId);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: classSessionId } };
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

export async function enrollStudentAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = classEnrollmentSchema.safeParse({
    classSessionId: formData.get("classSessionId"),
    studentName: formData.get("studentName"),
    studentPhone: formData.get("studentPhone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const enrollment = await enrollStudent(tenant.id, parsed.data);
    revalidatePath(`/${tenantSlug}/admin/classes`);
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
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await cancelEnrollment(tenant.id, enrollmentId);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: enrollmentId } };
}

export async function registerClassPaymentAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = registerClassPaymentSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    method: formData.get("method"),
    collectedBy: formData.get("collectedBy"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await registerClassPayment(tenant.id, parsed.data.enrollmentId, parsed.data.method, parsed.data.collectedBy);
  revalidatePath(`/${tenantSlug}/admin/classes`);
  return { ok: true, data: { id: parsed.data.enrollmentId } };
}
