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

export async function getDashboardStats(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  return withTenant(tenantId, async (tx) => {
    const [
      todayBookings,
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
      tx.booking.aggregate({
        where: {
          tenantId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startTime: { gte: weekStart },
        },
        _sum: { totalPriceCents: true },
      }),
      tx.booking.aggregate({
        where: {
          tenantId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startTime: { gte: monthStart },
        },
        _sum: { totalPriceCents: true },
      }),
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
      todayRevenueCents: todayBookings
        .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
        .reduce((sum, b) => sum + b.totalPriceCents, 0),
      weekRevenueCents: weekRevenue._sum.totalPriceCents ?? 0,
      monthRevenueCents: monthRevenue._sum.totalPriceCents ?? 0,
      occupancyPct,
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>,
    };
  });
}
