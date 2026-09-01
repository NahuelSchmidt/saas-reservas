import Link from "next/link";
import { ChevronLeft, ChevronRight, Banknote, Landmark, CreditCard, Wallet } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getAdminDaySchedule } from "@/lib/booking/admin-service";
import { getDailyCashRegister } from "@/lib/booking/admin-service";
import { formatCentsARS } from "@/lib/availability/engine";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleGrid } from "./schedule-grid";
import { toLocalISODate, parseLocalISODate, addLocalDays } from "@/lib/availability/date-utils";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date: dateParam } = await searchParams;
  const tenant = await resolveTenantBySlug(slug);

  const dateISO = dateParam ?? toLocalISODate(new Date());
  const date = parseLocalISODate(dateISO);

  const [schedule, cash] = await Promise.all([
    getAdminDaySchedule(tenant.id, date),
    getDailyCashRegister(tenant.id, date),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`?date=${addLocalDays(dateISO, -1)}`}
            className="flex size-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
            aria-label="Día anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-44 text-center font-heading font-semibold capitalize">
            {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <Link
            href={`?date=${addLocalDays(dateISO, 1)}`}
            className="flex size-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
            aria-label="Día siguiente"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-2 border-border/60 py-5 shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Banknote className="size-5" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold">{formatCentsARS(cash.cashCents)}</div>
              <div className="text-xs text-muted-foreground">Efectivo</div>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 border-border/60 py-5 shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <Landmark className="size-5" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold">{formatCentsARS(cash.transferCents)}</div>
              <div className="text-xs text-muted-foreground">Transferencia</div>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 border-border/60 py-5 shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold">{formatCentsARS(cash.onlineCents)}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 border-border/60 py-5 shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold">{formatCentsARS(cash.totalCents)}</div>
              <div className="text-xs text-muted-foreground">
                Total del día{cash.productsCents > 0 ? ` · ${formatCentsARS(cash.productsCents)} en productos` : ""}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!schedule.businessHours || !schedule.config ? (
        <p className="text-muted-foreground">
          Configurá el horario de apertura y la duración de turno de este día en{" "}
          <Link href={`/${slug}/admin/settings`} className="underline">Configuración</Link>.
        </p>
      ) : (
        <ScheduleGrid
          tenantSlug={tenant.slug}
          dateISO={dateISO}
          courts={schedule.courts}
          bookings={schedule.bookings}
          businessHours={schedule.businessHours}
          pricingRules={schedule.pricingRules}
          slotDurationMinutes={schedule.config.slotDurationMinutes}
          depositConfig={{
            depositRequired: schedule.config.depositRequired,
            depositIsPercentage: schedule.config.depositIsPercentage,
            depositValue: schedule.config.depositValue,
          }}
        />
      )}
    </div>
  );
}
