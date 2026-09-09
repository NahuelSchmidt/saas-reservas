"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { withTenant } from "@/lib/db/tenant-context";
import { staffInviteSchema, staffUpdateSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function inviteStaffAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = staffInviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { name, email, password, role } = parsed.data;

  const existingMembership = await withTenant(tenant.id, (tx) => tx.tenantMembership.findFirst({ where: { user: { email } } }));
  if (existingMembership) return { ok: false, error: "Ya existe una cuenta con ese email en este complejo." };

  // Si el email ya tiene una cuenta real (con contraseña) en otro complejo o
  // como jugador registrado, no la pisamos — solo le agregamos membership acá.
  // Si no existe, o existe como cuenta de invitado (sin contraseña, creada al
  // reservar sin cuenta), se la crea/completa con la contraseña indicada.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user = existingUser?.passwordHash
    ? existingUser
    : existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { name, passwordHash: await bcrypt.hash(password, 10) },
        })
      : await prisma.user.create({
          data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
        });

  const membership = await withTenant(tenant.id, (tx) =>
    tx.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role } }),
  );

  revalidatePath(`/${tenantSlug}/admin/staff`);
  return { ok: true, data: { id: membership.id } };
}

export async function updateStaffAction(
  tenantSlug: string,
  membershipId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = staffUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { name, email, password } = parsed.data;

  const membership = await withTenant(tenant.id, (tx) => tx.tenantMembership.findUnique({ where: { id: membershipId } }));
  if (!membership) return { ok: false, error: "No encontramos esa cuenta." };

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== membership.userId) {
    return { ok: false, error: "Ya hay otra cuenta con ese email." };
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      name,
      email,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath(`/${tenantSlug}/admin/staff`);
  return { ok: true, data: { id: membershipId } };
}

export async function updateStaffRoleAction(
  tenantSlug: string,
  membershipId: string,
  role: "ADMIN" | "EMPLOYEE" | "INSTRUCTOR",
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  await withTenant(tenant.id, (tx) => tx.tenantMembership.update({ where: { id: membershipId }, data: { role } }));
  revalidatePath(`/${tenantSlug}/admin/staff`);
  return { ok: true, data: { id: membershipId } };
}

export async function removeStaffAction(
  tenantSlug: string,
  membershipId: string,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  await withTenant(tenant.id, (tx) => tx.tenantMembership.delete({ where: { id: membershipId } }));
  revalidatePath(`/${tenantSlug}/admin/staff`);
  return { ok: true, data: { id: membershipId } };
}
