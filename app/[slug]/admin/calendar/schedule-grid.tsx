"use client";

import { useState } from "react";
import { formatCentsARS, resolvePrice } from "@/lib/availability/engine";
import { balanceDueCents } from "@/lib/booking/balance";
import { ManualBookingDialog } from "./manual-booking-dialog";
import { BookingDetailsDialog } from "./booking-details-dialog";

type Court = { id: string; name: string };
type Payment = { amountCents: number; status: string; type: string; method: string; note: string | null; createdAt: Date };
type Booking = {
  id: string;
  courtId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  isBlock: boolean;
  checkedIn: boolean;
  depositStatus: string;
  totalPriceCents: number;
  depositAmountCents: number;
  notes: string | null;
  recurringBookingId: string | null;
  bookedBy: { name: string; email: string };
  payments: Payment[];
};
type BusinessHours = { openTime: string; closeTime: string };
type PricingRule = { courtId: string | null; dayOfWeek: number | null; startTime: string; endTime: string; clientType: string; priceCents: number };
type DepositConfig = { depositRequired: boolean; depositIsPercentage: boolean; depositValue: number };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function ScheduleGrid({
  tenantSlug,
  dateISO,
  courts,
  bookings,
  businessHours,
  pricingRules,
  slotDurationMinutes,
  depositConfig,
}: {
  tenantSlug: string;
  dateISO: string;
  courts: Court[];
  bookings: Booking[];
  businessHours: BusinessHours;
  pricingRules: PricingRule[];
  slotDurationMinutes: number;
  depositConfig: DepositConfig;
}) {
  const [selected, setSelected] = useState<
    | { type: "free"; courtId: string; startTime: string; endTime: string; priceCents: number | null }
    | { type: "booking"; booking: Booking }
    | null
  >(null);

  const openMin = timeToMinutes(businessHours.openTime);
  const closeMin = timeToMinutes(businessHours.closeTime);
  const rows: number[] = [];
  for (let m = openMin; m + slotDurationMinutes <= closeMin; m += slotDurationMinutes) rows.push(m);

  const dayOfWeek = new Date(dateISO + "T00:00:00").getDay();

  function minutesToTime(m: number) {
    const h = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const min = (m % 60).toString().padStart(2, "0");
    return `${h}:${min}`;
  }

  function slotDate(minutes: number) {
    const d = new Date(dateISO + "T00:00:00");
    d.setMinutes(minutes);
    return d;
  }

  function findBooking(courtId: string, minutes: number) {
    const t = slotDate(minutes).getTime();
    return bookings.find((b) => b.courtId === courtId && new Date(b.startTime).getTime() === t);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Pagado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange-500" /> Falta cobrar</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> Pendiente de seña</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40" /> Bloqueado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-dashed border-muted-foreground/40" /> Libre</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-b px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Hora</th>
              {courts.map((c) => (
                <th key={c.id} className="border-b px-3 py-3 text-left font-heading font-bold">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m} className="even:bg-muted/20">
                <td className="border-b px-4 py-2 text-sm font-medium text-muted-foreground">{minutesToTime(m)}</td>
                {courts.map((court) => {
                  const booking = findBooking(court.id, m);
                  if (!booking) {
                    const priceCents = resolvePrice({ courtId: court.id, dayOfWeek, startMinutes: m, pricingRules });
                    return (
                      <td key={court.id} className="border-b p-1.5">
                        <button
                          className="flex w-full flex-col items-center rounded-lg border border-dashed border-muted-foreground/25 py-2 text-xs font-medium text-muted-foreground/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                          onClick={() =>
                            setSelected({
                              type: "free",
                              courtId: court.id,
                              startTime: slotDate(m).toISOString(),
                              endTime: slotDate(m + slotDurationMinutes).toISOString(),
                              priceCents,
                            })
                          }
                        >
                          <span>Libre</span>
                          {priceCents != null && <span className="text-[10px] opacity-70">{formatCentsARS(priceCents)}</span>}
                        </button>
                      </td>
                    );
                  }

                  const balance = balanceDueCents(booking.totalPriceCents, booking.payments);

                  const color = booking.isBlock
                    ? "bg-muted text-muted-foreground border-border"
                    : booking.status === "PENDING_PAYMENT"
                      ? "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-300"
                      : balance > 0
                        ? "bg-orange-500/10 text-orange-800 border-orange-500/20 dark:text-orange-300"
                        : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:text-emerald-300";

                  return (
                    <td key={court.id} className="border-b p-1.5">
                      <button
                        className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs ${color}`}
                        onClick={() => setSelected({ type: "booking", booking })}
                      >
                        {booking.isBlock ? (
                          <span>Bloqueado{booking.notes ? ` — ${booking.notes}` : ""}</span>
                        ) : (
                          <>
                            <div className="font-semibold">
                              {booking.bookedBy.name}
                              {booking.recurringBookingId && " 🔁"}
                            </div>
                            <div>
                              {balance > 0 && booking.status !== "PENDING_PAYMENT"
                                ? `Falta ${formatCentsARS(balance)}`
                                : formatCentsARS(booking.totalPriceCents)}
                              {booking.checkedIn ? " · Check-in ✓" : ""}
                            </div>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected?.type === "free" && (
        <ManualBookingDialog
          tenantSlug={tenantSlug}
          courtId={selected.courtId}
          startTime={selected.startTime}
          endTime={selected.endTime}
          defaultPriceCents={selected.priceCents}
          depositConfig={depositConfig}
          open
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
      {selected?.type === "booking" && (
        <BookingDetailsDialog
          tenantSlug={tenantSlug}
          booking={selected.booking}
          open
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </>
  );
}
