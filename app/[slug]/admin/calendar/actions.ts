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
  closeCashRegister,
  CashRegisterAlreadyClosedError,
} from "@/lib/booking/admin-service";
import { createRecurringBooking, cancelRecurringBooking, extendRecurringBooking } from "@/lib/booking/recurring-service";
import { cancelBooking, SlotUnavailableError } from "@/lib/booking/service";
import { parseLocalISODate } from "@/lib/availability/date-utils";
import {
  manualBookingSchema,
  registerPaymentSchema,
  recurringBookingSchema,
  closeCashRegisterSchema,
} from "@/lib/validation/schemas";
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
    playerPhone: formData.get("playerPhone"),
    playerName: formData.get("playerName"),
    totalPriceCents: Number(formData.get("totalPriceARS")) * 100,
    markDepositPaid: formData.get("markDepositPaid") === "on",
    depositMethod: formData.get("depositMethod") || "CASH",
    cashQuarterPriceCents: formData.get("cashQuarterPriceCents"),
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
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      totalPriceCents: parsed.data.totalPriceCents,
      cashQuarterPriceCents: parsed.data.cashQuarterPriceCents ?? null,
      depositAmountCents,
      depositMethod: parsed.data.depositMethod,
      playerPhone: parsed.data.playerPhone,
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
  closeAccount?: boolean,
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
    closeAccount,
  });
  revalidatePath(`/${tenantSlug}/admin/calendar`);
  return { ok: true, data: { ok: true } };
}

export async function createRecurringBookingAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string; conflicts: number }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = recurringBookingSchema.safeParse({
    courtId: formData.get("courtId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    playerEmail: formData.get("playerEmail"),
    playerName: formData.get("playerName"),
    priceCents: Number(formData.get("totalPriceARS")) * 100,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const { rule, conflicts } = await createRecurringBooking({
      tenantId: tenant.id,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      playerName: parsed.data.playerName,
      playerEmail: parsed.data.playerEmail,
      priceCents: parsed.data.priceCents,
      createdByUserId: actor.id,
    });
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    revalidatePath(`/${tenantSlug}/admin/calendar/recurring`);
    return { ok: true, data: { id: rule.id, conflicts: conflicts.length } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos crear el turno fijo." };
  }
}

export async function cancelRecurringBookingAction(
  tenantSlug: string,
  ruleId: string,
  cancelFutureInstances: boolean,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await cancelRecurringBooking({ tenantId: tenant.id, ruleId, cancelFutureInstances, actorUserId: actor.id });
  revalidatePath(`/${tenantSlug}/admin/calendar`);
  revalidatePath(`/${tenantSlug}/admin/calendar/recurring`);
  return { ok: true, data: { ok: true } };
}

export async function extendRecurringBookingAction(
  tenantSlug: string,
  ruleId: string,
): Promise<ActionResult<{ conflicts: number }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  try {
    const { conflicts } = await extendRecurringBooking({ tenantId: tenant.id, ruleId, actorUserId: actor.id });
    revalidatePath(`/${tenantSlug}/admin/calendar/recurring`);
    return { ok: true, data: { conflicts: conflicts.length } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos extender el turno fijo." };
  }
}

export async function closeCashRegisterAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ differenceCents: number }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = closeCashRegisterSchema.safeParse({
    date: formData.get("date"),
    countedCashCents: Number(formData.get("countedCashARS")) * 100,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const date = parseLocalISODate(parsed.data.date);
  if (date.getTime() > Date.now()) {
    return { ok: false, error: "No podés cerrar la caja de una fecha futura." };
  }

  try {
    const close = await closeCashRegister({
      tenantId: tenant.id,
      date,
      countedCashCents: parsed.data.countedCashCents,
      notes: parsed.data.notes,
      actorUserId: actor.id,
    });
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    return { ok: true, data: { differenceCents: close.differenceCents } };
  } catch (err) {
    if (err instanceof CashRegisterAlreadyClosedError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos cerrar la caja." };
  }
}
