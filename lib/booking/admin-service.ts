import { withTenant } from "@/lib/db/tenant-context";
import { guestEmailFromPhone } from "./guest";
import { sendBookingConfirmedWhatsApp } from "@/lib/whatsapp/evolution";
import { isExclusionViolation, SlotUnavailableError } from "./errors";

export async function getAdminDaySchedule(tenantId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  return withTenant(tenantId, async (tx) => {
    const [courts, bookings, businessHours, config, pricingRules] = await Promise.all([
      tx.court.findMany({ where: { tenantId, status: { not: "INACTIVE" } }, orderBy: { name: "asc" } }),
      tx.booking.findMany({
        where: {
          tenantId,
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED"] },
        },
        select: {
          id: true,
          courtId: true,
          startTime: true,
          endTime: true,
          status: true,
          isBlock: true,
          checkedIn: true,
          depositStatus: true,
          totalPriceCents: true,
          depositAmountCents: true,
          notes: true,
          recurringBookingId: true,
          bookedBy: { select: { name: true, email: true } },
          payments: {
            select: { amountCents: true, status: true, type: true, method: true, note: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { startTime: "asc" },
      }),
      tx.businessHours.findUnique({ where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: date.getDay() } } }),
      tx.bookingConfig.findUnique({ where: { tenantId } }),
      tx.pricingRule.findMany({ where: { tenantId } }),
    ]);

    return { courts, bookings, businessHours, config, pricingRules };
  });
}

/** Reserva manual cargada por un empleado/admin (walk-in, teléfono, etc.). Queda CONFIRMED directo, sin pasar por Mercado Pago. */
export async function createManualBooking(params: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  courtId: string;
  startTime: Date;
  endTime: Date;
  totalPriceCents: number;
  playerPhone: string;
  playerName: string;
  markDepositPaid: boolean;
  depositAmountCents: number;
  depositMethod: "CASH" | "TRANSFER";
  createdByUserId: string;
  notes?: string;
}) {
  const guestEmail = guestEmailFromPhone(params.playerPhone);

  const result = await withTenant(params.tenantId, async (tx) => {
    const player = await tx.user.upsert({
      where: { email: guestEmail },
      update: { name: params.playerName, phone: params.playerPhone },
      create: { email: guestEmail, name: params.playerName, phone: params.playerPhone },
    });

    try {
      const booking = await tx.booking.create({
        data: {
          tenantId: params.tenantId,
          courtId: params.courtId,
          bookedByUserId: player.id,
          createdByUserId: params.createdByUserId,
          startTime: params.startTime,
          endTime: params.endTime,
          status: "CONFIRMED",
          source: "MANUAL",
          totalPriceCents: params.totalPriceCents,
          depositAmountCents: params.depositAmountCents,
          depositStatus: params.markDepositPaid ? "PAID" : "PENDING",
          notes: params.notes,
        },
      });

      if (params.markDepositPaid && params.depositAmountCents > 0) {
        await tx.payment.create({
          data: {
            tenantId: params.tenantId,
            bookingId: booking.id,
            amountCents: params.depositAmountCents,
            method: params.depositMethod,
            status: "APPROVED",
            type: "DEPOSIT",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.createdByUserId,
          action: "booking.created_manual",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {},
        },
      });

      const court = await tx.court.findUniqueOrThrow({ where: { id: params.courtId }, select: { name: true } });

      return { booking, court };
    } catch (err) {
      if (isExclusionViolation(err)) throw new SlotUnavailableError();
      throw err;
    }
  });

  try {
    await sendBookingConfirmedWhatsApp({
      phone: params.playerPhone,
      playerName: params.playerName,
      tenantName: params.tenantName,
      tenantSlug: params.tenantSlug,
      bookingId: result.booking.id,
      courtName: result.court.name,
      startTime: params.startTime,
      endTime: params.endTime,
    });
  } catch (err) {
    console.error("No se pudo enviar el WhatsApp de confirmación", err);
  }

  return result.booking;
}

/** Bloquea un horario (mantenimiento, evento privado, clase) sin asociarlo a un jugador. */
export async function createBlock(params: {
  tenantId: string;
  courtId: string;
  startTime: Date;
  endTime: Date;
  createdByUserId: string;
  notes: string;
}) {
  return withTenant(params.tenantId, async (tx) => {
    try {
      const booking = await tx.booking.create({
        data: {
          tenantId: params.tenantId,
          courtId: params.courtId,
          bookedByUserId: params.createdByUserId,
          createdByUserId: params.createdByUserId,
          startTime: params.startTime,
          endTime: params.endTime,
          status: "CONFIRMED",
          source: "MANUAL",
          isBlock: true,
          totalPriceCents: 0,
          depositAmountCents: 0,
          depositStatus: "NOT_REQUIRED",
          notes: params.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.createdByUserId,
          action: "booking.blocked",
          entityType: "Booking",
          entityId: booking.id,
          metadata: { notes: params.notes },
        },
      });

      return booking;
    } catch (err) {
      if (isExclusionViolation(err)) throw new SlotUnavailableError();
      throw err;
    }
  });
}

export async function toggleCheckIn(tenantId: string, bookingId: string, checkedIn: boolean) {
  return withTenant(tenantId, (tx) => tx.booking.update({ where: { id: bookingId }, data: { checkedIn } }));
}

/** Registra un cobro (seña o saldo restante, en efectivo o transferencia) desde la caja del día. */
export async function registerCashPayment(params: {
  tenantId: string;
  bookingId: string;
  amountCents: number;
  method: "CASH" | "TRANSFER";
  actorUserId: string;
  note?: string;
}) {
  return withTenant(params.tenantId, async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: params.bookingId } });

    await tx.payment.create({
      data: {
        tenantId: params.tenantId,
        bookingId: booking.id,
        amountCents: params.amountCents,
        method: params.method,
        status: "APPROVED",
        type: booking.depositStatus === "PAID" ? "FULL" : "DEPOSIT",
        note: params.note || null,
      },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        depositStatus: booking.depositStatus === "PENDING" ? "PAID" : booking.depositStatus,
        status: booking.status === "PENDING_PAYMENT" ? "CONFIRMED" : booking.status,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        action: "payment.cash_registered",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { amountCents: params.amountCents },
      },
    });

    return updated;
  });
}

/** Caja diaria: efectivo vs online cobrado en el día. */
export async function getDailyCashRegister(tenantId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  return withTenant(tenantId, async (tx) => {
    const [payments, sales] = await Promise.all([
      tx.payment.findMany({
        where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd }, status: "APPROVED", type: { not: "REFUND" } },
      }),
      tx.sale.findMany({ where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } } }),
    ]);

    const bookingsCashCents = payments.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amountCents, 0);
    const bookingsTransferCents = payments.filter((p) => p.method === "TRANSFER").reduce((s, p) => s + p.amountCents, 0);
    const bookingsOnlineCents = payments.filter((p) => p.method === "MERCADOPAGO").reduce((s, p) => s + p.amountCents, 0);
    const productsCashCents = sales.filter((s) => s.method === "CASH").reduce((s, sale) => s + sale.totalCents, 0);
    const productsTransferCents = sales.filter((s) => s.method === "TRANSFER").reduce((s, sale) => s + sale.totalCents, 0);
    const productsOnlineCents = sales.filter((s) => s.method === "MERCADOPAGO").reduce((s, sale) => s + sale.totalCents, 0);

    const cashCents = bookingsCashCents + productsCashCents;
    const transferCents = bookingsTransferCents + productsTransferCents;
    const onlineCents = bookingsOnlineCents + productsOnlineCents;

    return {
      cashCents,
      transferCents,
      onlineCents,
      totalCents: cashCents + transferCents + onlineCents,
      productsCents: productsCashCents + productsTransferCents + productsOnlineCents,
    };
  });
}

/** Cierre de caja ya registrado para ese día, si existe. */
export async function getCashRegisterClose(tenantId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  return withTenant(tenantId, (tx) =>
    tx.cashRegisterClose.findUnique({
      where: { tenantId_date: { tenantId, date: dayStart } },
      include: { closedBy: { select: { name: true } } },
    }),
  );
}

export class CashRegisterAlreadyClosedError extends Error {
  constructor() {
    super("La caja de este día ya fue cerrada.");
  }
}

/**
 * Cierra la caja del día: recalcula lo esperado (mismo criterio que
 * getDailyCashRegister) y lo compara contra el efectivo contado a mano. El
 * `@@unique([tenantId, date])` de CashRegisterClose es la última palabra
 * contra un doble cierre concurrente, igual que el exclusion constraint de
 * bookings.
 */
export async function closeCashRegister(params: {
  tenantId: string;
  date: Date;
  countedCashCents: number;
  notes?: string;
  actorUserId: string;
}) {
  const dayStart = new Date(params.date);
  dayStart.setHours(0, 0, 0, 0);

  const cash = await getDailyCashRegister(params.tenantId, dayStart);
  const differenceCents = params.countedCashCents - cash.cashCents;

  try {
    return await withTenant(params.tenantId, async (tx) => {
      const close = await tx.cashRegisterClose.create({
        data: {
          tenantId: params.tenantId,
          date: dayStart,
          expectedCashCents: cash.cashCents,
          countedCashCents: params.countedCashCents,
          differenceCents,
          transferCents: cash.transferCents,
          onlineCents: cash.onlineCents,
          notes: params.notes,
          closedByUserId: params.actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.actorUserId,
          action: "cash_register.closed",
          entityType: "CashRegisterClose",
          entityId: close.id,
          metadata: { differenceCents },
        },
      });

      return close;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("cash_register_closes_tenantId_date_key")) throw new CashRegisterAlreadyClosedError();
    throw err;
  }
}
