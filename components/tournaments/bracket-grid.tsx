import type { ReactNode } from "react";

/**
 * Cuadro de eliminación directa con conectores en "codo" entre rondas.
 * Usa CSS grid: cada partido de la ronda r (0-indexed) ocupa 2^r filas
 * arrancando en fila `i * 2^r + 1` — eso lo centra automáticamente entre los
 * dos partidos de la ronda anterior que lo alimentan, sin cálculos de
 * píxeles a mano. El conector es un elbow (mitad borde-abajo, mitad
 * borde-arriba) que ocupa el alto completo de la celda: como esa celda ya
 * está centrada respecto a sus dos partidos de origen, el codo llega
 * naturalmente al punto medio entre ambos.
 */
export function BracketGrid<T extends { id: string; round: number }>({
  matches,
  renderMatch,
}: {
  matches: T[];
  renderMatch: (match: T) => ReactNode;
}) {
  const byRound = new Map<number, T[]>();
  for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
  const rounds = [...byRound.entries()].sort(([a], [b]) => a - b);
  const numFirstRoundSlots = rounds[0]?.[1].length ?? 0;

  if (rounds.length === 0 || numFirstRoundSlots === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-x-12"
        style={{
          gridTemplateColumns: `repeat(${rounds.length}, minmax(220px, 1fr))`,
          gridTemplateRows: `repeat(${numFirstRoundSlots}, minmax(76px, auto))`,
        }}
      >
        {rounds.map(([, roundMatches], rIdx) =>
          roundMatches.map((m, i) => {
            const span = 2 ** rIdx;
            const start = i * span + 1;
            return (
              <div
                key={m.id}
                className="relative flex flex-col justify-center gap-1 py-1"
                style={{ gridColumn: rIdx + 1, gridRow: `${start} / span ${span}` }}
              >
                {rIdx > 0 && (
                  <>
                    <div className="absolute top-0 -left-6 h-1/2 w-6 rounded-tl-md border-t border-l border-border/70" />
                    <div className="absolute bottom-0 -left-6 h-1/2 w-6 rounded-bl-md border-b border-l border-border/70" />
                  </>
                )}
                {rIdx < rounds.length - 1 && (
                  <div className="absolute top-1/2 -right-6 h-px w-6 bg-border/70" />
                )}
                {renderMatch(m)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
