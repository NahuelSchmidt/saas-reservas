export class SlotUnavailableError extends Error {
  constructor() {
    super("Ese horario ya no está disponible. Elegí otro turno.");
  }
}

export function isExclusionViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("23P01") || message.includes("no_overlapping_bookings");
}
