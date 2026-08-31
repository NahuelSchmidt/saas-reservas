/**
 * Convierte un Date a "YYYY-MM-DD" usando sus componentes LOCALES.
 * `toISOString().slice(0,10)` convierte a UTC primero, lo que corre la fecha
 * un día cuando el huso horario del servidor tiene offset positivo respecto
 * a UTC — por eso no se usa acá.
 */
export function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parsea "YYYY-MM-DD" como medianoche LOCAL (no UTC, que es lo que hace `new Date("YYYY-MM-DD")`). */
export function parseLocalISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addLocalDays(iso: string, days: number): string {
  const d = parseLocalISODate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}
