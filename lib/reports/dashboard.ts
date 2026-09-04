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
 * reservas (seña + saldo, sin reembolsos) + ventas de kiosco. Mismo criterio
 * que `getDailyCashRegister` (lib/booking/admin-service.ts), generalizado a
 * un rango en vez de un solo día — antes el dashboard sumaba el valor total
 * de las reservas confirmadas, que no es lo mismo que la plata que entró
 * (una reserva con seña del 30% "vale" el 100% pero solo cobrás el 30%), y
 * ni siquiera contaba el kiosco.
 */
async function getRevenueBreakdown(
  tx: Prisma.TransactionClient,
  tenantId: string,
  range: { from: Date; to?: Date },
) {
  const createdAt = range.to ? { gte: range.from, lt: range.to } : { gte: range.from };

  const [payments, sales] = await Promise.all([
    tx.payment.aggregate({
      where: { tenantId, createdAt, status: "APPROVED", type: { not: "REFUND" } },
      _sum: { amountCents: true },
    }),
    tx.sale.aggregate({
      where: { tenantId, createdAt },
      _sum: { totalCents: true },
    }),
  ]);

  const bookingsCents = payments._sum.amountCents ?? 0;
  const productsCents = sales._sum.totalCents ?? 0;
  return { bookingsCents, productsCents, totalCents: bookingsCents + productsCents };
}

export async function getDashboardStats(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  return withTenant(tenantId, async (tx) => {
    const [
      todayBookings,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      statusCounts,
      activeCourts,
      businessHoursToday,
      config,
    ] = await Promise.all([
      tx.booking.findMany({
        where: { tenantId, startTime: { gte: todayStart, lt: tomorrowStart } },
        select: { status: true, totalPriceCents: true, courtId: true },
      }),
      getRevenueBreakdown(tx, tenantId, { from: todayStart, to: tomorrowStart }),
      getRevenueBreakdown(tx, tenantId, { from: weekStart }),
      getRevenueBreakdown(tx, tenantId, { from: monthStart }),
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
      weekRevenueCents: weekRevenue.totalCents,
      monthRevenueCents: monthRevenue.totalCents,
      occupancyPct,
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>,
    };
  });
}
