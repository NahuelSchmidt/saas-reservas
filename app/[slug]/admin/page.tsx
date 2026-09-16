import { Percent, Wallet, TrendingUp, TrendingDown, CalendarClock, Clock } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getDashboardStats } from "@/lib/reports/dashboard";
import { formatCentsARS } from "@/lib/availability/engine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PENDING_PAYMENT: "Pendiente",
};

const STATUS_META: Record<string, { label: string; dot: string }> = {
  PENDING_PAYMENT: { label: "Pendientes", dot: "bg-amber-500" },
  CONFIRMED: { label: "Confirmadas", dot: "bg-emerald-500" },
  CANCELLED: { label: "Canceladas", dot: "bg-red-500" },
  COMPLETED: { label: "Completadas", dot: "bg-blue-500" },
  NO_SHOW: { label: "No-show", dot: "bg-slate-400" },
};

export default async function AdminDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const stats = await getDashboardStats(tenant.id);

  const statCards = [
    {
      label: "Ocupación de hoy",
      value: `${stats.occupancyPct}%`,
      sublabel: undefined as string | undefined,
      changePct: null as number | null,
      changeVsLabel: "",
      icon: Percent,
      color: "text-violet-600 bg-violet-500/10",
    },
    {
      label: "Ingresos de hoy",
      value: formatCentsARS(stats.todayRevenueCents),
      sublabel:
        stats.todayRevenueProductsCents > 0 || stats.todayRevenueClassesCents > 0
          ? [
              `${formatCentsARS(stats.todayRevenueBookingsCents)} reservas`,
              stats.todayRevenueProductsCents > 0 && `${formatCentsARS(stats.todayRevenueProductsCents)} kiosco`,
              stats.todayRevenueClassesCents > 0 && `${formatCentsARS(stats.todayRevenueClassesCents)} clases`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined,
      changePct: stats.todayRevenueChangePct,
      changeVsLabel: "vs. ayer",
      icon: Wallet,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Ingresos de la semana",
      value: formatCentsARS(stats.weekRevenueCents),
      sublabel: undefined as string | undefined,
      changePct: stats.weekRevenueChangePct,
      changeVsLabel: "vs. semana pasada",
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      label: "Ingresos del mes",
      value: formatCentsARS(stats.monthRevenueCents),
      sublabel: undefined as string | undefined,
      changePct: stats.monthRevenueChangePct,
      changeVsLabel: "vs. mes pasado",
      icon: CalendarClock,
      color: "text-amber-600 bg-amber-500/10",
    },
  ];

  const statusTotal = Object.values(stats.statusCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Cómo viene el complejo hoy, esta semana y este mes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="gap-3 border-border/60 py-6 shadow-sm">
            <CardContent className="flex flex-col gap-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-2xl font-bold">{s.value}</span>
                  {s.changePct != null && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        s.changePct >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {s.changePct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct}%
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.label}
                  {s.changePct != null && <span className="text-muted-foreground/70"> {s.changeVsLabel}</span>}
                </div>
                {s.sublabel && <div className="text-xs text-muted-foreground">{s.sublabel}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 py-6 shadow-sm lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold">Próximos turnos</h2>
            {stats.upcomingBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No quedan turnos por jugar hoy.</p>
            ) : (
              <div className="flex flex-col divide-y">
                {stats.upcomingBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground">
                      <Clock className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold tabular-nums">
                        {b.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {b.courtName} · {b.playerName}
                      </span>
                    </div>
                    <Badge variant={b.status === "CONFIRMED" ? "default" : "secondary"} className="shrink-0">
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/60 py-6 shadow-sm">
            <CardContent className="flex flex-col gap-5">
              <h2 className="font-heading text-base font-bold">Reservas de hoy</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-secondary/60 p-4 text-center">
                  <div className="font-heading text-2xl font-bold">{stats.todayTotal}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
                  <div className="font-heading text-2xl font-bold text-emerald-600">{stats.todayConfirmed}</div>
                  <div className="text-xs text-muted-foreground">Confirmadas</div>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                  <div className="font-heading text-2xl font-bold text-amber-600">{stats.todayPending}</div>
                  <div className="text-xs text-muted-foreground">Pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 py-6 shadow-sm">
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-bold">Reservas del mes por estado</h2>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {Object.entries(STATUS_META).map(([status, meta]) => {
                  const count = stats.statusCounts[status] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={status}
                      className={meta.dot}
                      style={{ width: `${(count / statusTotal) * 100}%` }}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(STATUS_META).map(([status, meta]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${meta.dot}`} />
                    <span className="text-muted-foreground">{meta.label}</span>
                    <span className="ml-auto font-medium">{stats.statusCounts[status] ?? 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
