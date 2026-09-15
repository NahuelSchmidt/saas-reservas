/**
 * Clasificación visual de un partido: jugado / en curso / próximo. El status
 * IN_PROGRESS existe en el modelo pero ningún flujo lo asigna todavía (no hay
 * botón de "marcar en curso"), así que "en curso" se infiere por horario:
 * si ya pasó la hora programada y no hay resultado cargado, se considera en
 * juego. Es una aproximación (no sabemos si arrancó puntual) pero es mejor
 * señal que no mostrar nada.
 */
export type MatchTimeStatus = "PLAYED" | "LIVE" | "UPCOMING";

export function classifyMatchTimeStatus(match: { status: string; scheduledAt: Date | null }): MatchTimeStatus {
  if (match.status === "COMPLETED" || match.status === "WALKOVER") return "PLAYED";
  if (match.status === "IN_PROGRESS") return "LIVE";
  if (match.scheduledAt && match.scheduledAt.getTime() <= Date.now()) return "LIVE";
  return "UPCOMING";
}
