import { CalendarDays, MapPin } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getDayAvailability } from "@/lib/booking/service";
import { withTenant } from "@/lib/db/tenant-context";
import { toLocalISODate } from "@/lib/availability/date-utils";
import { cn } from "@/lib/utils";
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

  const hasCoverPhoto = Boolean(tenant.coverPhotoUrl);
  const mapUrl = tenant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        {tenant.coverPhotoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenant.coverPhotoUrl} alt={tenant.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent" />
        )}
        <div
          className={cn(
            "relative mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-8 text-center sm:gap-4 sm:px-10 sm:py-14",
            hasCoverPhoto && "py-16 sm:py-24",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              hasCoverPhoto ? "bg-white/15 text-white backdrop-blur-sm" : "bg-secondary/15 text-secondary-foreground",
            )}
          >
            <MapPin className="size-3.5" /> Pádel · {courtCount} {courtCount === 1 ? "cancha" : "canchas"}
          </span>
          <h1 className={cn("text-3xl font-bold tracking-tight sm:text-5xl", hasCoverPhoto && "text-white")}>
            {tenant.name}
          </h1>
          <p className={cn("max-w-lg text-base sm:text-lg", hasCoverPhoto ? "text-white/85" : "text-muted-foreground")}>
            Elegí un día y horario disponible y reservá tu cancha en minutos.
          </p>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                hasCoverPhoto
                  ? "border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <MapPin className="size-4" /> Ver en el mapa
            </a>
          )}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6 sm:gap-8 sm:px-10 sm:py-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4" />
          Disponibilidad
        </div>
        <BookingBoard
          tenantSlug={tenant.slug}
          tenantName={tenant.name}
          initialDateISO={toLocalISODate(today)}
          initialSlots={initialSlots}
        />
      </div>
    </div>
  );
}
