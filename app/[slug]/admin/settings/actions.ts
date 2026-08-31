"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant-context";
import {
  bookingConfigSchema,
  cancellationPolicySchema,
  businessHoursSchema,
  type BusinessHoursInput,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function updateBookingConfigAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = bookingConfigSchema.safeParse({
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    minAdvanceMinutes: formData.get("minAdvanceMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    depositRequired: formData.get("depositRequired") === "on",
    depositIsPercentage: formData.get("depositIsPercentage") === "on",
    depositValue: formData.get("depositValue"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await withTenant(tenant.id, (tx) =>
    tx.bookingConfig.upsert({
      where: { tenantId: tenant.id },
      update: parsed.data,
      create: { tenantId: tenant.id, ...parsed.data },
    }),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function updateCancellationPolicyAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = cancellationPolicySchema.safeParse({
    hoursBeforeFullRefund: formData.get("hoursBeforeFullRefund"),
    hoursBeforePartialRefund: formData.get("hoursBeforePartialRefund"),
    partialRefundPct: formData.get("partialRefundPct"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await withTenant(tenant.id, (tx) =>
    tx.cancellationPolicy.upsert({
      where: { tenantId: tenant.id },
      update: parsed.data,
      create: { tenantId: tenant.id, ...parsed.data },
    }),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function updateBusinessHoursAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const updates: BusinessHoursInput[] = [];
  for (let day = 0; day <= 6; day++) {
    const parsed = businessHoursSchema.safeParse({
      dayOfWeek: day,
      openTime: formData.get(`openTime-${day}`),
      closeTime: formData.get(`closeTime-${day}`),
    });
    if (!parsed.success) return { ok: false, error: `Horario inválido para el día ${day}` };
    updates.push(parsed.data);
  }

  await withTenant(tenant.id, (tx) =>
    Promise.all(
      updates.map((u) =>
        tx.businessHours.upsert({
          where: { tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: u.dayOfWeek } },
          update: u,
          create: { tenantId: tenant.id, ...u },
        }),
      ),
    ),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}
