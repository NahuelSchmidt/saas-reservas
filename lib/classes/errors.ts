export class ClassSessionFullError extends Error {
  constructor() {
    super("Esta clase ya no tiene cupo disponible.");
  }
}

export class CourtNotAvailableError extends Error {
  constructor() {
    super("La cancha elegida ya está ocupada en ese horario (otra clase o una reserva).");
  }
}

export class AlreadyEnrolledError extends Error {
  constructor() {
    super("Ya estás inscripto en esta clase.");
  }
}
