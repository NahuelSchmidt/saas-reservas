"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lightbulb, Layers } from "lucide-react";
import { getAvailabilityAction, createBookingAction } from "@/app/actions/booking";
import { formatCentsARS, type Slot } from "@/lib/availability/engine";
import { addLocalDays, parseLocalISODate } from "@/lib/availability/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LOCATION_LABEL: Record<string, string> = {
  INDOOR: "Indoor",
  OUTDOOR: "Al aire libre",
  PANORAMIC: "Panorámica",
  COVERED: "Techada",
};

function formatDuration(startTime: Date, endTime: Date) {
  const minutes = (endTime.getTime() - startTime.getTime()) / 60_000;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

export function BookingBoard({
  tenantSlug,
  initialDateISO,
  initialSlots,
}: {
  tenantSlug: string;
  initialDateISO: string;
  initialSlots: Slot[];
}) {
  const router = useRouter();
  const [dateISO, setDateISO] = useState(initialDateISO);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [bookingKey, setBookingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const times = useMemo(() => {
    const seen = new Map<number, Date>();
    for (const slot of slots) seen.set(slot.startTime.getTime(), slot.startTime);
    return Array.from(seen.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [slots]);

  const courtsForSelectedTime = useMemo(() => {
    if (selectedTime == null) return [];
    return slots
      .filter((s) => s.startTime.getTime() === selectedTime)
      .sort((a, b) => a.priceCents - b.priceCents);
  }, [slots, selectedTime]);

  function loadDate(nextISO: string) {
    setDateISO(nextISO);
    setSelectedTime(null);
    startTransition(async () => {
      const result = await getAvailabilityAction(tenantSlug, nextISO);
      if (result.ok) setSlots(result.data);
      else toast.error(result.error);
    });
  }

  function book(slot: Slot) {
    const key = `${slot.courtId}-${slot.startTime.toISOString()}`;
    setBookingKey(key);
    startTransition(async () => {
      const result = await createBookingAction(tenantSlug, {
        courtId: slot.courtId,
        startTime: slot.startTime,
      });
      setBookingKey(null);

      if (!result.ok) {
        if (result.error.includes("iniciar sesión")) {
          router.push(`/login?callbackUrl=/${tenantSlug}`);
          return;
        }
        toast.error(result.error);
        loadDate(dateISO); // la disponibilidad puede haber cambiado, refrescar
        return;
      }

      if (result.data.paymentUrl) {
        window.location.href = result.data.paymentUrl;
      } else {
        toast.success("¡Reserva confirmada!");
        router.push(`/${tenantSlug}/reservas/${result.data.bookingId}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => loadDate(addLocalDays(dateISO, -1))}
          className="flex size-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
          aria-label="Día anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-52 text-center font-heading text-lg font-semibold capitalize">
          {parseLocalISODate(dateISO).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <button
          onClick={() => loadDate(addLocalDays(dateISO, 1))}
          className="flex size-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
          aria-label="Día siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div>
        <h2 className="mb-4 text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Horarios disponibles
        </h2>

        {isPending && slots.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Cargando...</p>
        )}
        {!isPending && times.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No hay horarios disponibles este día.</p>
        )}

        <div className="flex flex-wrap justify-center gap-2.5">
          {times.map((t) => {
            const active = selectedTime === t.getTime();
            return (
              <button
                key={t.getTime()}
                onClick={() => setSelectedTime(t.getTime())}
                className={`rounded-full px-5 py-2.5 text-base font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 text-secondary-foreground hover:bg-secondary"
                }`}
              >
                {t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTime == null ? (
        <p className="text-center text-sm text-muted-foreground">Elegí un horario para ver las canchas disponibles.</p>
      ) : (
        <div>
          <h2 className="mb-4 text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Canchas a las{" "}
            {new Date(selectedTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courtsForSelectedTime.map((slot) => {
              const key = `${slot.courtId}-${slot.startTime.toISOString()}`;
              const attributes = [
                slot.courtSurface,
                LOCATION_LABEL[slot.courtLocation] ?? slot.courtLocation,
              ].filter(Boolean) as string[];

              return (
                <Card key={key} className="gap-4 border-border/60 py-6 shadow-sm">
                  <CardContent className="flex flex-col gap-4">
                    <div>
                      <span className="font-heading text-lg font-bold">{slot.courtName}</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {attributes.map((a) => (
                          <span
                            key={a}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                          >
                            <Layers className="size-3" /> {a}
                          </span>
                        ))}
                        {slot.courtHasLighting && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            <Lightbulb className="size-3" /> Iluminación
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end justify-between border-t pt-4">
                      <div>
                        <div className="font-heading text-xl font-bold">{formatCentsARS(slot.priceCents)}</div>
                        <div className="text-xs text-muted-foreground">{formatDuration(slot.startTime, slot.endTime)}</div>
                      </div>
                      <Button disabled={isPending && bookingKey === key} onClick={() => book(slot)}>
                        Reservar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
