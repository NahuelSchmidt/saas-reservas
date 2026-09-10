"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lightbulb, Layers } from "lucide-react";
import { getAvailabilityAction, createBookingAction } from "@/app/actions/booking";
import { formatCentsARS, type Slot } from "@/lib/availability/engine";
import { addLocalDays, parseLocalISODate } from "@/lib/availability/date-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  tenantName,
  initialDateISO,
  initialSlots,
}: {
  tenantSlug: string;
  tenantName: string;
  initialDateISO: string;
  initialSlots: Slot[];
}) {
  const router = useRouter();
  const [dateISO, setDateISO] = useState(initialDateISO);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [view, setView] = useState<"list" | "grid">("grid");
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const courts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of slots) seen.set(s.courtId, s.courtName);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  const times = useMemo(() => {
    const seen = new Map<number, Date>();
    for (const s of slots) seen.set(s.startTime.getTime(), s.startTime);
    return Array.from(seen.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [slots]);

  const groupedByTime = useMemo(() => {
    const byTime = new Map<number, { time: Date; slots: Slot[] }>();
    for (const s of slots) {
      const key = s.startTime.getTime();
      if (!byTime.has(key)) byTime.set(key, { time: s.startTime, slots: [] });
      byTime.get(key)!.slots.push(s);
    }
    return Array.from(byTime.values())
      .map((g) => ({ ...g, slots: [...g.slots].sort((a, b) => a.courtName.localeCompare(b.courtName)) }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [slots]);

  const selectedTimeGroup = groupedByTime.find((g) => g.time.getTime() === selectedTime) ?? null;

  function findSlot(courtId: string, time: Date) {
    return slots.find((s) => s.courtId === courtId && s.startTime.getTime() === time.getTime());
  }

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
    if (!playerName.trim() || !playerPhone.trim()) {
      toast.error("Completá tu nombre y teléfono.");
      return;
    }
    startTransition(async () => {
      const result = await createBookingAction(tenantSlug, {
        courtId: slot.courtId,
        startTime: slot.startTime,
        playerName: playerName.trim(),
        playerPhone: playerPhone.trim(),
      });

      if (!result.ok) {
        toast.error(result.error);
        setSelected(null);
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => loadDate(addLocalDays(dateISO, -1))}
          className="flex size-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
          aria-label="Día anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-center font-heading text-base font-semibold capitalize sm:min-w-52 sm:text-lg">
          <span className="sm:hidden">
            {parseLocalISODate(dateISO).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <span className="hidden sm:inline">
            {parseLocalISODate(dateISO).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </span>
        <button
          onClick={() => loadDate(addLocalDays(dateISO, 1))}
          className="flex size-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
          aria-label="Día siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {isPending && slots.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Cargando...</p>
      )}
      {!isPending && times.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No hay horarios disponibles este día.</p>
      )}

      {times.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              view === "list"
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            Horarios
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              view === "grid"
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            Canchas
          </button>
        </div>
      )}

      {times.length > 0 && view === "list" && !selectedTimeGroup && (
        <div className="flex flex-col divide-y overflow-hidden rounded-2xl border shadow-sm">
          {groupedByTime.map(({ time, slots: group }) => (
            <button
              key={time.getTime()}
              onClick={() => setSelectedTime(time.getTime())}
              className="flex items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted active:bg-muted"
            >
              <span className="font-heading text-base font-bold tabular-nums">
                {time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {group.length} {group.length === 1 ? "cancha libre" : "canchas libres"}
                <ChevronRight className="size-4" />
              </span>
            </button>
          ))}
        </div>
      )}

      {times.length > 0 && view === "list" && selectedTimeGroup && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setSelectedTime(null)}
            className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Elegir otro horario
          </button>
          <div className="rounded-2xl border shadow-sm">
            <div className="border-b px-4 py-3 font-heading text-base font-bold tabular-nums">
              {selectedTimeGroup.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex flex-col divide-y">
              {selectedTimeGroup.slots.map((slot) => (
                <button
                  key={slot.courtId}
                  onClick={() => setSelected(slot)}
                  className="flex items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted active:bg-muted"
                >
                  <span className="text-sm font-semibold">{slot.courtName}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{formatCentsARS(slot.priceCents)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {times.length > 0 && view === "grid" && (
        <div className="overflow-x-auto rounded-2xl border shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Hora
                </th>
                {courts.map((c) => (
                  <th key={c.id} className="border-b px-3 py-3 text-left font-heading font-bold whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => (
                <tr key={t.getTime()} className="even:bg-muted/20">
                  <td className="border-b px-4 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground">
                    {t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  {courts.map((c) => {
                    const slot = findSlot(c.id, t);
                    return (
                      <td key={c.id} className="border-b p-1.5">
                        {slot ? (
                          <button
                            onClick={() => setSelected(slot)}
                            className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center transition-colors hover:border-primary/50 hover:bg-primary/10"
                          >
                            <div className="text-sm font-bold tracking-wide text-primary uppercase">Libre</div>
                            <div className="text-xs font-medium text-primary/70">{formatCentsARS(slot.priceCents)}</div>
                          </button>
                        ) : (
                          <div className="py-2 text-center text-xs text-muted-foreground/40">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <p className="text-xs font-medium text-muted-foreground uppercase">{tenantName}</p>
                <DialogTitle>{selected.courtName}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {selected.courtSurface && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      <Layers className="size-3" /> {selected.courtSurface}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    <Layers className="size-3" /> {LOCATION_LABEL[selected.courtLocation] ?? selected.courtLocation}
                  </span>
                  {selected.courtHasLighting && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Lightbulb className="size-3" /> Iluminación
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between border-t pt-3">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {parseLocalISODate(dateISO).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                      {" · "}
                      {selected.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="font-heading text-2xl font-bold">{formatCentsARS(selected.priceCents)}</div>
                    <div className="text-xs text-muted-foreground">{formatDuration(selected.startTime, selected.endTime)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="playerName">Nombre completo</Label>
                    <Input id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Juan Pérez" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="playerPhone">Teléfono</Label>
                    <Input
                      id="playerPhone"
                      type="tel"
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      placeholder="11 2345 6789"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button disabled={isPending} onClick={() => book(selected)}>
                  {isPending ? "Reservando..." : "Confirmar reserva"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
