import { CalendarDays, MapPin } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getDayAvailability } from "@/lib/booking/service";
import { withTenant } from "@/lib/db/tenant-context";
import { toLocalISODate } from "@/lib/availability/date-utils";
import { BookingBoard } from "./booking-board";

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [initialSlots, courtCount] = await Promise.all([
    getDayAvailability({ tenantId: tenant.id, date: today }),
    withTenant(tenant.id, (tx) => tx.court.count({ where: { tenantId: tenant.id, status: "ACTIVE" } })),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent px-6 py-14 sm:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <MapPin className="size-3.5" /> Pádel · {courtCount} {courtCount === 1 ? "cancha" : "canchas"}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{tenant.name}</h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Elegí un día y horario disponible y reservá tu cancha en minutos.
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4" />
          Disponibilidad
        </div>
        <BookingBoard tenantSlug={tenant.slug} initialDateISO={toLocalISODate(today)} initialSlots={initialSlots} />
      </div>
    </div>
  );
}
