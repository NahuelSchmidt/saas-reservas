"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant-context";
import { pricingRuleSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function createPricingRuleAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const courtIdRaw = formData.get("courtId");
  const dayOfWeekRaw = formData.get("dayOfWeek");

  const parsed = pricingRuleSchema.safeParse({
    courtId: courtIdRaw === "ALL" || !courtIdRaw ? null : courtIdRaw,
    dayOfWeek: dayOfWeekRaw === "ALL" || !dayOfWeekRaw ? null : dayOfWeekRaw,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    clientType: formData.get("clientType") ?? "ANY",
    priceCents: Number(formData.get("priceARS")) * 100,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const rule = await withTenant(tenant.id, (tx) => tx.pricingRule.create({ data: { tenantId: tenant.id, ...parsed.data } }));
  revalidatePath(`/${tenantSlug}/admin/pricing`);
  return { ok: true, data: { id: rule.id } };
}

export async function updatePricingRuleAction(
  tenantSlug: string,
  ruleId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const courtIdRaw = formData.get("courtId");
  const dayOfWeekRaw = formData.get("dayOfWeek");

  const parsed = pricingRuleSchema.safeParse({
    courtId: courtIdRaw === "ALL" || !courtIdRaw ? null : courtIdRaw,
    dayOfWeek: dayOfWeekRaw === "ALL" || !dayOfWeekRaw ? null : dayOfWeekRaw,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    clientType: formData.get("clientType") ?? "ANY",
    priceCents: Number(formData.get("priceARS")) * 100,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await withTenant(tenant.id, (tx) => tx.pricingRule.update({ where: { id: ruleId }, data: parsed.data }));
  revalidatePath(`/${tenantSlug}/admin/pricing`);
  return { ok: true, data: { id: ruleId } };
}

export async function deletePricingRuleAction(tenantSlug: string, ruleId: string): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  await withTenant(tenant.id, (tx) => tx.pricingRule.delete({ where: { id: ruleId } }));
  revalidatePath(`/${tenantSlug}/admin/pricing`);
  return { ok: true, data: { id: ruleId } };
}
