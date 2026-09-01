"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant-context";
import {
  createManualBooking,
  createBlock,
  toggleCheckIn,
  registerCashPayment,
} from "@/lib/booking/admin-service";
import { cancelBooking, SlotUnavailableError } from "@/lib/booking/service";
import { manualBookingSchema, registerPaymentSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function createManualBookingAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = manualBookingSchema.safeParse({
    courtId: formData.get("courtId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    playerEmail: formData.get("playerEmail"),
    playerName: formData.get("playerName"),
    totalPriceCents: Number(formData.get("totalPriceARS")) * 100,
    markDepositPaid: formData.get("markDepositPaid") === "on",
    depositMethod: formData.get("depositMethod") || "CASH",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  // La seña se calcula acá, no se confía en lo que mande el cliente: misma
  // fórmula que el flujo online (config.depositRequired/depositIsPercentage/depositValue).
  const config = await withTenant(tenant.id, (tx) => tx.bookingConfig.findUnique({ where: { tenantId: tenant.id } }));
  const depositAmountCents = config?.depositRequired
    ? config.depositIsPercentage
      ? Math.round((parsed.data.totalPriceCents * config.depositValue) / 100)
      : config.depositValue
    : parsed.data.totalPriceCents;

  try {
    const booking = await createManualBooking({
      tenantId: tenant.id,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      totalPriceCents: parsed.data.totalPriceCents,
      depositAmountCents,
      depositMethod: parsed.data.depositMethod,
      playerEmail: parsed.data.playerEmail,
      playerName: parsed.data.playerName,
      markDepositPaid: parsed.data.markDepositPaid,
      createdByUserId: actor.id,
    });
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    return { ok: true, data: { id: booking.id } };
  } catch (err) {
    if (err instanceof SlotUnavailableError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos crear la reserva." };
  }
}

export async function createBlockAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const courtId = String(formData.get("courtId"));
  const startTime = new Date(String(formData.get("startTime")));
  const endTime = new Date(String(formData.get("endTime")));
  const notes = String(formData.get("notes") || "Bloqueado");

  try {
    const booking = await createBlock({ tenantId: tenant.id, courtId, startTime, endTime, createdByUserId: actor.id, notes });
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    return { ok: true, data: { id: booking.id } };
  } catch (err) {
    if (err instanceof SlotUnavailableError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos bloquear el horario." };
  }
}

export async function cancelBookingAdminAction(
  tenantSlug: string,
  bookingId: string,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  try {
    await cancelBooking({ tenantId: tenant.id, bookingId, actorUserId: actor.id });
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos cancelar la reserva." };
  }
}

export async function toggleCheckInAction(
  tenantSlug: string,
  bookingId: string,
  checkedIn: boolean,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await toggleCheckIn(tenant.id, bookingId, checkedIn);
  revalidatePath(`/${tenantSlug}/admin/calendar`);
  return { ok: true, data: { ok: true } };
}

export async function registerCashPaymentAction(
  tenantSlug: string,
  bookingId: string,
  amountARS: number,
  method: "CASH" | "TRANSFER",
  note?: string,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = registerPaymentSchema.safeParse({ bookingId, amountCents: Math.round(amountARS * 100), method, note });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await registerCashPayment({
    tenantId: tenant.id,
    bookingId: parsed.data.bookingId,
    amountCents: parsed.data.amountCents,
    method: parsed.data.method,
    actorUserId: actor.id,
    note: parsed.data.note,
  });
  revalidatePath(`/${tenantSlug}/admin/calendar`);
  return { ok: true, data: { ok: true } };
}
