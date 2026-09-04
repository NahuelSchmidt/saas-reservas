export class SlotUnavailableError extends Error {
  constructor() {
    super("Ese horario ya no está disponible. Elegí otro turno.");
  }
}

export class MercadoPagoNotConnectedError extends Error {
  constructor() {
    super("Este complejo todavía no conectó Mercado Pago para cobrar señas. Contactalo directamente.");
  }
}

export function isExclusionViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("23P01") || message.includes("no_overlapping_bookings");
}
