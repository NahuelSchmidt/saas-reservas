/**
 * Fuerza la zona horaria del proceso a Argentina, sin importar dónde corra
 * el servidor (Vercel usa UTC por defecto). Todo el código de disponibilidad
 * y reservas (lib/availability/*, lib/booking/*) arma horarios con setters
 * de Date en "hora local" (setHours, setMinutes, etc.) asumiendo que esa
 * hora local ES la de Argentina — sin esto, en producción "local" es UTC y
 * cada turno queda guardado 3 horas antes de lo que realmente se reservó.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export function register() {
  process.env.TZ = "America/Argentina/Buenos_Aires";
}
