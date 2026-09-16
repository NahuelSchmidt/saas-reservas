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

/**
 * Orden de siembra para armar zonas/cuadro: si algún equipo tiene `seed`
 * asignado manualmente, se respeta ese orden; si no, se sortea al azar. Hoy
 * no hay UI para cargar `seed` a mano, así que en la práctica esto siempre
 * sortea — se deja la rama de `seed` por si en el futuro se agrega esa opción.
 */
export function drawOrder<T extends { seed: number | null }>(teams: T[]): T[] {
  const hasManualSeeds = teams.some((t) => t.seed != null);
  return hasManualSeeds ? [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999)) : shuffle(teams);
}

/**
 * Reordena una lista de clasificados (agrupados por posición: todos los
 * 1ros primero, luego todos los 2dos, etc. — ver generateKnockoutFromGroups)
 * para que ningún cruce de primera ronda enfrente a dos equipos del mismo
 * grupo, siempre que eso sea matemáticamente posible.
 *
 * Por qué hace falta esto además de separar por posición: el emparejamiento
 * de primera ronda de `seedOrder` es una estructura fija sobre NÚMEROS de
 * seed (para size 8: (1,8) (4,5) (2,7) (3,6)), no sabe nada de grupos. Con
 * cantidades "raras" de grupos (ej. 3 grupos de 2 clasificados en un cuadro
 * de 8), los seeds del último grupo procesado pueden caer justo en uno de
 * esos pares fijos — ej. si el grupo C queda en los seeds 3 y 6, (3,6) es
 * un cruce de primera ronda y los dos vienen del mismo grupo.
 *
 * La solución es un intercambio: para cada cruce real (sin bye) que colisiona,
 * busca otro cruce real con el que se pueda intercambiar un equipo sin que
 * ninguno de los dos cruces quede colisionando. El orden de entrada define
 * el número de seed (índice + 1), así que intercambiar posiciones acá
 * equivale a reasignar los seeds antes de pasarlos a `seedOrder`.
 *
 * Cada intercambio deja limpios a los dos cruces que tocó y nunca reabre uno
 * ya resuelto, así que repetir el barrido completo hasta que una pasada no
 * mueva nada converge (nunca puede empeorar) y resuelve casos que un único
 * barrido se pierde por el orden en que visita los cruces.
 */
export function resolveGroupCollisions<T extends { groupId: string }>(qualifiers: T[], bracketSize: number): T[] {
  const result = [...qualifiers];
  const numTeams = result.length;
  const order = seedOrder(bracketSize);
  const pairs: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
  const realPairs = pairs.filter(([a, b]) => a <= numTeams && b <= numTeams);

  for (let pass = 0; pass < realPairs.length; pass++) {
    let swapped = false;

    for (const [a, b] of realPairs) {
      if (result[a - 1].groupId !== result[b - 1].groupId) continue;

      for (const [c, d] of realPairs) {
        if (c === a && d === b) continue;
        const bVal = result[b - 1];
        const cVal = result[c - 1];
        const dVal = result[d - 1];

        if (result[a - 1].groupId !== dVal.groupId && cVal.groupId !== bVal.groupId) {
          result[b - 1] = dVal;
          result[d - 1] = bVal;
          swapped = true;
          break;
        }
        if (result[a - 1].groupId !== cVal.groupId && dVal.groupId !== bVal.groupId) {
          result[b - 1] = cVal;
          result[c - 1] = bVal;
          swapped = true;
          break;
        }
      }
    }

    if (!swapped) break;
  }

  return result;
}
