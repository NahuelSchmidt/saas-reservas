"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant-context";
import { courtSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function createCourtAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = courtSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    surface: formData.get("surface") || undefined,
    location: formData.get("location"),
    hasLighting: formData.get("hasLighting") === "on",
    capacity: formData.get("capacity"),
    status: formData.get("status") ?? "ACTIVE",
    photos: [],
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const court = await withTenant(tenant.id, (tx) =>
    tx.court.create({ data: { ...parsed.data, tenantId: tenant.id } }),
  );
  revalidatePath(`/${tenantSlug}/admin/courts`);
  return { ok: true, data: { id: court.id } };
}

export async function updateCourtAction(
  tenantSlug: string,
  courtId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = courtSchema.partial().safeParse({
    name: formData.get("name") || undefined,
    type: formData.get("type") || undefined,
    surface: formData.get("surface") || undefined,
    location: formData.get("location") || undefined,
    hasLighting: formData.get("hasLighting") === "on",
    capacity: formData.get("capacity") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await withTenant(tenant.id, (tx) => tx.court.update({ where: { id: courtId }, data: parsed.data }));
  revalidatePath(`/${tenantSlug}/admin/courts`);
  return { ok: true, data: { id: courtId } };
}
