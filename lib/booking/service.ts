import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { withTenant } from "@/lib/db/tenant-context";
import { computeAvailableSlots } from "@/lib/availability/engine";
import { createDepositPreference } from "@/lib/payments/mercadopago";
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from "@/lib/email/resend";
import { SlotUnavailableError, isExclusionViolation } from "./errors";

export { SlotUnavailableError };

async function computeAvailabilityWithTx(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; date: Date; courtId?: string },
) {
  const [config, businessHours, pricingRules, courts, bookings] = await Promise.all([
    tx.bookingConfig.findUnique({ where: { tenantId: params.tenantId } }),
    tx.businessHours.findMany({ where: { tenantId: params.tenantId } }),
    tx.pricingRule.findMany({ where: { tenantId: params.tenantId } }),
    tx.court.findMany({
      where: { tenantId: params.tenantId, status: "ACTIVE", ...(params.courtId ? { id: params.courtId } : {}) },
    }),
    tx.booking.findMany({
      where: { tenantId: params.tenantId, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } },
      select: { courtId: true, startTime: true, endTime: true },
    }),
  ]);

  if (!config) return [];

  return computeAvailableSlots({
    date: params.date,
    courts,
    businessHours,
    pricingRules,
    existingBookings: bookings,
    slotDurationMinutes: config.slotDurationMinutes,
    minAdvanceMinutes: config.minAdvanceMinutes,
  });
}

export async function getDayAvailability(params: { tenantId: string; date: Date; courtId?: string }) {
  return withTenant(params.tenantId, (tx) => computeAvailabilityWithTx(tx, params));
}

/**
 * Crea una reserva. Si el complejo requiere seña, la reserva queda en
 * PENDING_PAYMENT y se devuelve el link de pago de Mercado Pago; si no,
 * queda CONFIRMED directamente.
 *
 * La disponibilidad se revalida acá mismo (no solo confiar en lo que el
 * cliente mandó) y la última palabra la tiene el exclusion constraint de la
 * base: si otra request ganó la carrera, esta llamada falla con
 * SlotUnavailableError.
 *
 * Las llamadas externas (Mercado Pago, email) se hacen DESPUÉS de que la
 * transacción de base de datos cierra — nunca dentro de una transacción,
 * para no tener una conexión abierta esperando una API de terceros.
 */
export async function createBooking(params: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  courtId: string;
  startTime: Date;
  bookedByUserId: string;
  playerEmail: string;
  notes?: string;
}) {
  const { tenantId, tenantSlug, tenantName, courtId, startTime, bookedByUserId, playerEmail, notes } = params;

  const result = await withTenant(tenantId, async (tx) => {
    const [config, court] = await Promise.all([
      tx.bookingConfig.findUnique({ where: { tenantId } }),
      tx.court.findUnique({ where: { id: courtId } }),
    ]);
    if (!config || !court) throw new Error("Configuración del complejo incompleta");

    const endTime = new Date(startTime.getTime() + config.slotDurationMinutes * 60_000);

    const slots = await computeAvailabilityWithTx(tx, { tenantId, date: startTime, courtId });
    const slot = slots.find((s) => s.startTime.getTime() === startTime.getTime());
    if (!slot) throw new SlotUnavailableError();

    const depositAmountCents = config.depositRequired
      ? config.depositIsPercentage
        ? Math.round((slot.priceCents * config.depositValue) / 100)
        : config.depositValue
      : 0;

    let booking;
    try {
      booking = await tx.booking.create({
        data: {
          tenantId,
          courtId,
          bookedByUserId,
          startTime,
          endTime,
          status: config.depositRequired ? "PENDING_PAYMENT" : "CONFIRMED",
          source: "ONLINE",
          totalPriceCents: slot.priceCents,
          depositAmountCents,
          depositStatus: config.depositRequired ? "PENDING" : "NOT_REQUIRED",
          notes,
        },
      });
    } catch (err) {
      if (isExclusionViolation(err)) throw new SlotUnavailableError();
      throw err;
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: bookedByUserId,
        action: "booking.created",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { source: "ONLINE" },
      },
    });

    return { booking, court, config, depositAmountCents, priceCents: slot.priceCents };
  });

  const { booking, court, config, depositAmountCents, priceCents } = result;

  if (!config.depositRequired) {
    try {
      await sendBookingConfirmedEmail({
        to: playerEmail,
        tenantName,
        tenantSlug,
        bookingId: booking.id,
        courtName: court.name,
        startTime,
        totalPriceCents: priceCents,
        depositAmountCents: 0,
      });
    } catch (err) {
      // La reserva ya es válida sin seña; no fallar la reserva por un error de email.
      console.error("No se pudo enviar el email de confirmación", err);
    }
    return { booking, paymentUrl: null as string | null };
  }

  try {
    const preference = await createDepositPreference({
      bookingId: booking.id,
      tenantSlug,
      courtName: court.name,
      startTime,
      amountCents: depositAmountCents,
      payerEmail: playerEmail,
    });
    return { booking, paymentUrl: preference.initPoint ?? null };
  } catch (err) {
    // Sin link de pago la reserva PENDING_PAYMENT quedaría bloqueando el
    // horario para siempre (el exclusion constraint la trata como ocupada).
    // La cancelamos para liberar el turno y que el usuario pueda reintentar.
    await withTenant(tenantId, (tx) =>
      tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }),
    );
    console.error("No se pudo crear la preferencia de pago, reserva cancelada", err);
    throw new Error("No pudimos generar el link de pago. Intentá de nuevo en unos minutos.");
  }
}

/** Llamado desde el webhook de Mercado Pago cuando un pago queda aprobado. */
export async function confirmBookingPayment(params: {
  tenantId: string;
  bookingId: string;
  providerPaymentId: string;
  amountCents: number;
}) {
  const result = await withTenant(params.tenantId, async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: params.bookingId },
      include: { court: true, bookedBy: true, tenant: true },
    });
    if (!booking) return null;

    // Idempotencia: si ya está confirmada, no reprocesar (el webhook de MP puede reintentar).
    if (booking.status === "CONFIRMED") return { booking, alreadyConfirmed: true as const };

    const existingPayment = await tx.payment.findFirst({
      where: { providerPaymentId: params.providerPaymentId },
    });
    if (existingPayment) return { booking, alreadyConfirmed: true as const };

    await tx.payment.create({
      data: {
        tenantId: params.tenantId,
        bookingId: booking.id,
        amountCents: params.amountCents,
        method: "MERCADOPAGO",
        providerPaymentId: params.providerPaymentId,
        status: "APPROVED",
        type: "DEPOSIT",
      },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", depositStatus: "PAID" },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        action: "booking.payment_confirmed",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { providerPaymentId: params.providerPaymentId },
      },
    });

    return { booking: { ...booking, ...updated }, alreadyConfirmed: false as const };
  });

  if (!result || result.alreadyConfirmed) return result?.booking ?? null;

  try {
    await sendBookingConfirmedEmail({
      to: result.booking.bookedBy.email,
      tenantName: result.booking.tenant.name,
      tenantSlug: result.booking.tenant.slug,
      bookingId: result.booking.id,
      courtName: result.booking.court.name,
      startTime: result.booking.startTime,
      totalPriceCents: result.booking.totalPriceCents,
      depositAmountCents: result.booking.depositAmountCents,
    });
  } catch (err) {
    // El pago ya quedó confirmado; no fallar la conciliación por un error de email.
    console.error("No se pudo enviar el email de confirmación", err);
  }

  return result.booking;
}

/** Cancela una reserva y calcula el reembolso según la política del complejo. */
export async function cancelBooking(params: {
  tenantId: string;
  bookingId: string;
  actorUserId: string;
  reason?: string;
}) {
  const result = await withTenant(params.tenantId, async (tx) => {
    const [booking, policy] = await Promise.all([
      tx.booking.findUnique({
        where: { id: params.bookingId },
        include: { court: true, bookedBy: true, tenant: true },
      }),
      tx.cancellationPolicy.findUnique({ where: { tenantId: params.tenantId } }),
    ]);
    if (!booking) throw new Error("Reserva no encontrada");
    if (booking.status === "CANCELLED") return { booking, refundAmountCents: 0, alreadyCancelled: true as const };

    const hoursUntilStart = (booking.startTime.getTime() - Date.now()) / 3_600_000;

    let refundPct = 0;
    if (policy) {
      if (hoursUntilStart >= policy.hoursBeforeFullRefund) refundPct = 100;
      else if (hoursUntilStart >= policy.hoursBeforePartialRefund) refundPct = policy.partialRefundPct;
    }
    const refundAmountCents =
      booking.depositStatus === "PAID" ? Math.round((booking.depositAmountCents * refundPct) / 100) : 0;

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        depositStatus:
          refundAmountCents > 0
            ? refundAmountCents === booking.depositAmountCents
              ? "REFUNDED"
              : "PARTIAL_REFUND"
            : booking.depositStatus,
      },
    });

    if (refundAmountCents > 0) {
      await tx.payment.create({
        data: {
          tenantId: params.tenantId,
          bookingId: booking.id,
          amountCents: refundAmountCents,
          method: "MERCADOPAGO",
          status: "PENDING", // el reembolso efectivo en MP se dispara manualmente desde el panel admin en el MVP
          type: "REFUND",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        action: "booking.cancelled",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { reason: params.reason, refundAmountCents },
      },
    });

    return { booking: { ...booking, ...updated }, refundAmountCents, alreadyCancelled: false as const };
  });

  if (result.alreadyCancelled) return result.booking;

  try {
    await sendBookingCancelledEmail({
      to: result.booking.bookedBy.email,
      tenantName: result.booking.tenant.name,
      courtName: result.booking.court.name,
      startTime: result.booking.startTime,
      refundAmountCents: result.refundAmountCents,
    });
  } catch (err) {
    // La cancelación ya se aplicó; no fallarla por un error de email.
    console.error("No se pudo enviar el email de cancelación", err);
  }

  return result.booking;
}

export async function findTenantIdForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { tenantId: true } });
  return booking?.tenantId ?? null;
}

export async function getBookingDetail(tenantId: string, bookingId: string) {
  return withTenant(tenantId, (tx) =>
    tx.booking.findUnique({
      where: { id: bookingId },
      include: { court: true, bookedBy: { select: { id: true, name: true, email: true } } },
    }),
  );
}
