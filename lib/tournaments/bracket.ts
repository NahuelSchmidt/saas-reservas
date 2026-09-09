/**
 * Helpers de armado de cuadro/fixture, sin dependencia de Prisma — puramente
 * funciones sobre arrays, para poder testearlas sin base de datos.
 */

/** Menor potencia de 2 mayor o igual a n (tamaño de cuadro necesario). */
export function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return Math.max(2, size);
}

/**
 * Orden de siembra estándar de un cuadro de `size` (potencia de 2): para
 * size=8 da [1,8,4,5,2,7,3,6], que es el orden clásico donde el seed 1 y el
 * seed 2 solo pueden cruzarse en la final. Los números son 1-based.
 */
export function seedOrder(size: number): number[] {
  if (size === 1) return [1];
  const prev = seedOrder(size / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s, size + 1 - s);
  }
  return result;
}

/** Etiqueta de fase según qué tan lejos está esta ronda de la final. */
export function stageLabelForRound(roundIndex: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - 1 - roundIndex;
  switch (roundsFromFinal) {
    case 0:
      return "Final";
    case 1:
      return "Semifinal";
    case 2:
      return "Cuartos de final";
    case 3:
      return "Octavos de final";
    default:
      return `Ronda ${roundIndex + 1}`;
  }
}

/**
 * Método del círculo para armar un fixture de todos-contra-todos: devuelve
 * una lista de "fechas", cada una con los pares que juegan esa fecha. Si la
 * cantidad de equipos es impar, se agrega un bye (null) que hace descansar a
 * uno distinto cada fecha.
 */
export function roundRobinSchedule<T>(teams: T[]): Array<Array<[T, T]>> {
  const list: Array<T | null> = [...teams];
  if (list.length % 2 !== 0) list.push(null);
  const n = list.length;
  if (n < 2) return [];

  const rounds: Array<Array<[T, T]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[T, T]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) pairs.push([a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() as T | null);
  }
  return rounds;
}

/** Distribución serpentina en N grupos, para repartir mejor a los cabezas de serie. */
export function distributeIntoGroups<T>(teamsBySeed: T[], numGroups: number): T[][] {
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  teamsBySeed.forEach((team, i) => {
    const lap = Math.floor(i / numGroups);
    const posInLap = i % numGroups;
    const groupIndex = lap % 2 === 0 ? posInLap : numGroups - 1 - posInLap;
    groups[groupIndex].push(team);
  });
  return groups;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
