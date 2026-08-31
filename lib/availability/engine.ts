export type Slot = {
  courtId: string;
  courtName: string;
  courtSurface: string | null;
  courtLocation: string;
  courtHasLighting: boolean;
  startTime: Date;
  endTime: Date;
  priceCents: number;
};

type CourtForAvailability = {
  id: string;
  name: string;
  surface: string | null;
  location: string;
  hasLighting: boolean;
};

type BusinessHoursRow = { dayOfWeek: number; openTime: string; closeTime: string };
type PricingRuleRow = {
  courtId: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  clientType: string;
  priceCents: number;
};
type BookingRow = { courtId: string; startTime: Date; endTime: Date };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToDate(day: Date, minutes: number) {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/**
 * Calcula los slots disponibles de un día para un conjunto de canchas,
 * combinando horario de apertura, duración de turno, reservas existentes
 * (PENDING_PAYMENT y CONFIRMED bloquean el horario) y reglas de precio.
 *
 * La protección real anti doble-reserva vive en la base de datos (exclusion
 * constraint); este cálculo solo evita ofrecerle al usuario un horario que
 * ya sabemos ocupado, para una buena UX.
 */
export function computeAvailableSlots(params: {
  date: Date;
  courts: CourtForAvailability[];
  businessHours: BusinessHoursRow[];
  pricingRules: PricingRuleRow[];
  existingBookings: BookingRow[];
  slotDurationMinutes: number;
  minAdvanceMinutes: number;
  now?: Date;
}): Slot[] {
  const {
    date,
    courts,
    businessHours,
    pricingRules,
    existingBookings,
    slotDurationMinutes,
    minAdvanceMinutes,
    now = new Date(),
  } = params;

  const dayOfWeek = date.getDay();
  const hours = businessHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!hours) return [];

  const openMin = timeToMinutes(hours.openTime);
  const closeMin = timeToMinutes(hours.closeTime);
  const earliestBookableAt = new Date(now.getTime() + minAdvanceMinutes * 60_000);

  const slots: Slot[] = [];

  for (const court of courts) {
    const bookingsForCourt = existingBookings.filter((b) => b.courtId === court.id);

    for (let start = openMin; start + slotDurationMinutes <= closeMin; start += slotDurationMinutes) {
      const startTime = minutesToDate(date, start);
      const endTime = minutesToDate(date, start + slotDurationMinutes);

      if (startTime < earliestBookableAt) continue;

      const overlaps = bookingsForCourt.some(
        (b) => startTime < b.endTime && endTime > b.startTime,
      );
      if (overlaps) continue;

      const price = resolvePrice({
        courtId: court.id,
        dayOfWeek,
        startMinutes: start,
        pricingRules,
      });
      if (price == null) continue; // sin regla de precio configurada -> no se ofrece

      slots.push({
        courtId: court.id,
        courtName: court.name,
        courtSurface: court.surface,
        courtLocation: court.location,
        courtHasLighting: court.hasLighting,
        startTime,
        endTime,
        priceCents: price,
      });
    }
  }

  return slots;
}

/** Resuelve el precio de una cancha/día/horario según las reglas configuradas (más específica gana). */
export function resolvePrice(params: {
  courtId: string;
  dayOfWeek: number;
  startMinutes: number;
  pricingRules: PricingRuleRow[];
}): number | null {
  const { courtId, dayOfWeek, startMinutes, pricingRules } = params;

  // Preferir reglas más específicas: cancha+día > cancha > día > genérica.
  const candidates = pricingRules
    .filter((r) => r.courtId === null || r.courtId === courtId)
    .filter((r) => r.dayOfWeek === null || r.dayOfWeek === dayOfWeek)
    .filter((r) => {
      const s = timeToMinutes(r.startTime);
      const e = timeToMinutes(r.endTime);
      return startMinutes >= s && startMinutes < e;
    })
    .sort((a, b) => specificity(b) - specificity(a));

  return candidates[0]?.priceCents ?? null;
}

function specificity(r: PricingRuleRow) {
  return (r.courtId ? 1 : 0) + (r.dayOfWeek !== null ? 1 : 0);
}

export function formatCentsARS(cents: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    cents / 100,
  );
}
