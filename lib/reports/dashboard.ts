import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/db/tenant-context";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

/**
 * Plata efectivamente cobrada en un rango de fechas: pagos aprobados de
 * reservas (seña + saldo, sin reembolsos) + ventas de kiosco + clases
 * pagadas en el club (collectedBy: CLUB — las pagadas directo al profesor
 * quedan afuera, esa plata nunca la tuvo el club). Mismo criterio que
 * `getDailyCashRegister` (lib/booking/admin-service.ts), generalizado a
 * un rango en vez de un solo día — antes el dashboard sumaba el valor total
 * de las reservas confirmadas, que no es lo mismo que la plata que entró
 * (una reserva con seña del 30% "vale" el 100% pero solo cobrás el 30%), y
 * ni siquiera contaba el kiosco ni las clases.
 */
async function getRevenueBreakdown(
  tx: Prisma.TransactionClient,
  tenantId: string,
  range: { from: Date; to?: Date },
) {
  const createdAt = range.to ? { gte: range.from, lt: range.to } : { gte: range.from };
  const paidAt = range.to ? { gte: range.from, lt: range.to } : { gte: range.from };

  const [payments, sales, classEnrollments] = await Promise.all([
    tx.payment.aggregate({
      where: { tenantId, createdAt, status: "APPROVED", type: { not: "REFUND" } },
      _sum: { amountCents: true },
    }),
    tx.sale.aggregate({
      where: { tenantId, createdAt },
      _sum: { totalCents: true },
    }),
    tx.classEnrollment.aggregate({
      where: { tenantId, paidAt, paymentStatus: "PAID", collectedBy: "CLUB" },
      _sum: { priceCents: true },
    }),
  ]);

  const bookingsCents = payments._sum.amountCents ?? 0;
  const productsCents = sales._sum.totalCents ?? 0;
  const classesCents = classEnrollments._sum.priceCents ?? 0;
  return { bookingsCents, productsCents, classesCents, totalCents: bookingsCents + productsCents + classesCents };
}

/**
 * % de cambio contra el período anterior. `null` cuando el período anterior
 * está en $0 — no hay base para expresar un porcentaje (evita mostrar
 * "+∞%" o un "0%" que en realidad es "sin datos todavía en ningún lado").
 */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardStats(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // Comparaciones "a la misma altura": hoy/esta semana/este mes están
  // siempre a mitad de andar, así que comparar contra el período anterior
  // COMPLETO (ayer entero, semana pasada entera) siempre da una caída
  // artificial. En cambio, se compara contra el mismo tramo transcurrido
  // del período anterior (mismas horas de ayer, mismos días de la semana
  // pasada, etc.).
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const yesterdayComparableEnd = new Date(yesterdayStart.getTime() + (now.getTime() - todayStart.getTime()));
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const lastWeekComparableEnd = new Date(lastWeekStart.getTime() + (now.getTime() - weekStart.getTime()));
  const lastMonthStart = startOfMonth(new Date(monthStart.getTime() - 1));
  const lastMonthComparableEnd = new Date(lastMonthStart.getTime() + (now.getTime() - monthStart.getTime()));

  return withTenant(tenantId, async (tx) => {
    const [
      todayBookings,
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      lastWeekRevenue,
      monthRevenue,
      lastMonthRevenue,
      statusCounts,
      activeCourts,
      businessHoursToday,
      config,
      upcomingBookings,
    ] = await Promise.all([
      tx.booking.findMany({
        where: { tenantId, startTime: { gte: todayStart, lt: tomorrowStart } },
        select: { status: true, totalPriceCents: true, courtId: true },
      }),
      getRevenueBreakdown(tx, tenantId, { from: todayStart, to: tomorrowStart }),
      getRevenueBreakdown(tx, tenantId, { from: yesterdayStart, to: yesterdayComparableEnd }),
      getRevenueBreakdown(tx, tenantId, { from: weekStart }),
      getRevenueBreakdown(tx, tenantId, { from: lastWeekStart, to: lastWeekComparableEnd }),
      getRevenueBreakdown(tx, tenantId, { from: monthStart }),
      getRevenueBreakdown(tx, tenantId, { from: lastMonthStart, to: lastMonthComparableEnd }),
      tx.booking.groupBy({
        by: ["status"],
        where: { tenantId, startTime: { gte: monthStart } },
        _count: true,
      }),
      tx.court.count({ where: { tenantId, status: "ACTIVE" } }),
      tx.businessHours.findUnique({
        where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: now.getDay() } },
      }),
      tx.bookingConfig.findUnique({ where: { tenantId } }),
      tx.booking.findMany({
        where: {
          tenantId,
          isBlock: false,
          startTime: { gte: now, lt: tomorrowStart },
          status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        },
        select: {
          id: true,
          startTime: true,
          status: true,
          court: { select: { name: true } },
          bookedBy: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
    ]);

    let occupancyPct = 0;
    if (businessHoursToday && config && activeCourts > 0) {
      const [oh, om] = businessHoursToday.openTime.split(":").map(Number);
      const [ch, cm] = businessHoursToday.closeTime.split(":").map(Number);
      const totalMinutes = ch * 60 + cm - (oh * 60 + om);
      const totalSlots = Math.max(1, Math.floor(totalMinutes / config.slotDurationMinutes)) * activeCourts;
      const bookedSlots = todayBookings.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT").length;
      occupancyPct = Math.min(100, Math.round((bookedSlots / totalSlots) * 100));
    }

    return {
      todayTotal: todayBookings.length,
      todayConfirmed: todayBookings.filter((b) => b.status === "CONFIRMED").length,
      todayPending: todayBookings.filter((b) => b.status === "PENDING_PAYMENT").length,
      todayRevenueCents: todayRevenue.totalCents,
      todayRevenueBookingsCents: todayRevenue.bookingsCents,
      todayRevenueProductsCents: todayRevenue.productsCents,
      todayRevenueClassesCents: todayRevenue.classesCents,
      todayRevenueChangePct: pctChange(todayRevenue.totalCents, yesterdayRevenue.totalCents),
      weekRevenueCents: weekRevenue.totalCents,
      weekRevenueChangePct: pctChange(weekRevenue.totalCents, lastWeekRevenue.totalCents),
      monthRevenueCents: monthRevenue.totalCents,
      monthRevenueChangePct: pctChange(monthRevenue.totalCents, lastMonthRevenue.totalCents),
      occupancyPct,
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>,
      upcomingBookings: upcomingBookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        status: b.status,
        courtName: b.court.name,
        playerName: b.bookedBy.name,
      })),
    };
  });
}
