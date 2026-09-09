import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/db/tenant-context";
import {
  nextPowerOfTwo,
  seedOrder,
  stageLabelForRound,
  roundRobinSchedule,
  distributeIntoGroups,
  shuffle,
} from "./bracket";

// ---------------------------------------------------------------------------
// Torneos / categorías
// ---------------------------------------------------------------------------

export async function listTournaments(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.tournament.findMany({
      include: { categories: { include: { _count: { select: { teams: true, participants: true } } } } },
      orderBy: { startDate: "desc" },
    }),
  );
}

export async function getTournament(tenantId: string, tournamentId: string) {
  return withTenant(tenantId, (tx) =>
    tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: {
          include: {
            teams: { include: { members: { include: { participant: true } } } },
            participants: true,
            groups: { include: { standings: { include: { team: true }, orderBy: { points: "desc" } } } },
            matches: { include: { teamA: true, teamB: true, winnerTeam: true, court: true }, orderBy: { round: "asc" } },
          },
        },
      },
    }),
  );
}

export async function createTournament(
  tenantId: string,
  input: {
    name: string;
    description?: string;
    format: "SINGLE_ELIMINATION" | "GROUPS_KNOCKOUT" | "AMERICANO";
    startDate: Date;
    endDate?: Date;
    registrationFeeCents?: number;
    maxTeamsPerCategory?: number;
  },
  createdByUserId?: string,
) {
  return withTenant(tenantId, (tx) =>
    tx.tournament.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        format: input.format,
        startDate: input.startDate,
        endDate: input.endDate,
        registrationFeeCents: input.registrationFeeCents ?? 0,
        maxTeamsPerCategory: input.maxTeamsPerCategory,
        createdByUserId: createdByUserId || null,
        status: "DRAFT",
      },
    }),
  );
}

export async function updateTournamentStatus(
  tenantId: string,
  tournamentId: string,
  status: "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
) {
  return withTenant(tenantId, (tx) => tx.tournament.update({ where: { id: tournamentId }, data: { status } }));
}

export async function createCategory(tenantId: string, input: { tournamentId: string; name: string; maxTeams?: number }) {
  return withTenant(tenantId, (tx) =>
    tx.tournamentCategory.create({
      data: { tenantId, tournamentId: input.tournamentId, name: input.name, maxTeams: input.maxTeams },
    }),
  );
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

/** Pareja fija — usar para SINGLE_ELIMINATION y GROUPS_KNOCKOUT. */
export async function registerTeam(
  tenantId: string,
  input: {
    categoryId: string;
    player1Name: string;
    player1Phone?: string;
    player2Name: string;
    player2Phone?: string;
  },
) {
  return withTenant(tenantId, async (tx) => {
    const [p1, p2] = await Promise.all([
      tx.tournamentParticipant.create({
        data: { tenantId, categoryId: input.categoryId, name: input.player1Name, phone: input.player1Phone },
      }),
      tx.tournamentParticipant.create({
        data: { tenantId, categoryId: input.categoryId, name: input.player2Name, phone: input.player2Phone },
      }),
    ]);

    const team = await tx.tournamentTeam.create({
      data: {
        tenantId,
        categoryId: input.categoryId,
        name: `${input.player1Name} / ${input.player2Name}`,
      },
    });

    await tx.tournamentTeamMember.createMany({
      data: [
        { teamId: team.id, participantId: p1.id },
        { teamId: team.id, participantId: p2.id },
      ],
    });

    return team;
  });
}

/** Jugador suelto — usar para AMERICANO, donde no hay pareja fija de inscripción. */
export async function registerParticipant(tenantId: string, input: { categoryId: string; name: string; phone?: string }) {
  return withTenant(tenantId, (tx) =>
    tx.tournamentParticipant.create({
      data: { tenantId, categoryId: input.categoryId, name: input.name, phone: input.phone },
    }),
  );
}

// ---------------------------------------------------------------------------
// Armado de cuadro de eliminación directa (SINGLE_ELIMINATION, y también la
// fase final de GROUPS_KNOCKOUT una vez que se sabe quién clasificó).
//
// Se crean las rondas de atrás para adelante (final primero) para poder
// encadenar nextMatchId hacia una fila que ya existe. Los "byes" (cuando la
// cantidad de equipos no es potencia de 2) solo pueden darse en la primera
// ronda por cómo se elige el tamaño del cuadro, así que no hace falta
// propagar más de un nivel.
// ---------------------------------------------------------------------------

async function buildSingleEliminationBracket(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; tournamentId: string; categoryId: string; teams: { id: string }[] },
) {
  const { tenantId, tournamentId, categoryId, teams } = params;
  const numTeams = teams.length;
  if (numTeams < 2) throw new Error("Hacen falta al menos 2 equipos para armar el cuadro");

  const bracketSize = nextPowerOfTwo(numTeams);
  const totalRounds = Math.log2(bracketSize);
  const order = seedOrder(bracketSize); // 1-based seed numbers en orden de slot
  const slots: (string | null)[] = order.map((seedNum) => (seedNum <= numTeams ? teams[seedNum - 1].id : null));

  // matchesByRound[r] = filas creadas de esa ronda, en orden de bracket (0-based)
  const matchesByRound: { id: string; teamAId: string | null; teamBId: string | null }[][] = [];

  for (let roundIndex = totalRounds - 1; roundIndex >= 0; roundIndex--) {
    const numMatches = bracketSize / 2 ** (roundIndex + 1);
    const stageLabel = stageLabelForRound(roundIndex, totalRounds);
    const created: { id: string; teamAId: string | null; teamBId: string | null }[] = [];

    for (let i = 0; i < numMatches; i++) {
      const isFirstRound = roundIndex === 0;
      const teamAId = isFirstRound ? slots[2 * i] : null;
      const teamBId = isFirstRound ? slots[2 * i + 1] : null;
      const nextRound = matchesByRound[matchesByRound.length - 1]; // ronda siguiente ya creada (más cerca de la final)
      const nextMatch = roundIndex === totalRounds - 1 ? null : nextRound[Math.floor(i / 2)];

      const match = await tx.tournamentMatch.create({
        data: {
          tenantId,
          tournamentId,
          categoryId,
          stageLabel,
          round: roundIndex + 1,
          teamAId,
          teamBId,
          nextMatchId: nextMatch?.id ?? null,
          nextMatchSlot: nextMatch ? (i % 2 === 0 ? "A" : "B") : null,
        },
      });
      created.push({ id: match.id, teamAId, teamBId });
    }
    matchesByRound.push(created);
  }

  // matchesByRound quedó en orden [final, semis, ..., primera ronda]; resolver
  // byes de la primera ronda (el último elemento del array).
  const firstRoundMatches = matchesByRound[matchesByRound.length - 1];
  for (const m of firstRoundMatches) {
    const hasBye = (m.teamAId && !m.teamBId) || (!m.teamAId && m.teamBId);
    if (!hasBye) continue;
    const winnerTeamId = (m.teamAId ?? m.teamBId) as string;
    const full = await tx.tournamentMatch.findUnique({ where: { id: m.id } });
    await tx.tournamentMatch.update({
      where: { id: m.id },
      data: { status: "WALKOVER", winnerTeamId },
    });
    if (full?.nextMatchId && full.nextMatchSlot) {
      await tx.tournamentMatch.update({
        where: { id: full.nextMatchId },
        data: full.nextMatchSlot === "A" ? { teamAId: winnerTeamId } : { teamBId: winnerTeamId },
      });
    }
  }

  return matchesByRound.flat();
}

export async function generateSingleEliminationFixture(tenantId: string, categoryId: string) {
  return withTenant(tenantId, async (tx) => {
    const category = await tx.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { teams: { where: { status: "REGISTERED" } } },
    });
    if (!category) throw new Error("Categoría no encontrada");

    // Siembra: por `seed` si se asignó, sino por orden de inscripción.
    const teams = [...category.teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
    return buildSingleEliminationBracket(tx, {
      tenantId,
      tournamentId: category.tournamentId,
      categoryId,
      teams,
    });
  });
}

// ---------------------------------------------------------------------------
// Fase de grupos (GROUPS_KNOCKOUT)
// ---------------------------------------------------------------------------

export async function generateGroupStage(tenantId: string, categoryId: string, numGroups?: number) {
  return withTenant(tenantId, async (tx) => {
    const category = await tx.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { teams: { where: { status: "REGISTERED" } } },
    });
    if (!category) throw new Error("Categoría no encontrada");

    const teams = [...category.teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
    const groupCount = numGroups ?? Math.max(1, Math.ceil(teams.length / 4));
    const groups = distributeIntoGroups(teams, groupCount);

    for (let g = 0; g < groups.length; g++) {
      const groupTeams = groups[g];
      if (groupTeams.length === 0) continue;
      const groupName = `Grupo ${String.fromCharCode(65 + g)}`;
      const group = await tx.tournamentGroup.create({ data: { tenantId, categoryId, name: groupName } });

      await tx.tournamentGroupStanding.createMany({
        data: groupTeams.map((t) => ({ groupId: group.id, teamId: t.id })),
      });

      const schedule = roundRobinSchedule(groupTeams.map((t) => t.id));
      for (let matchday = 0; matchday < schedule.length; matchday++) {
        for (const [teamAId, teamBId] of schedule[matchday]) {
          await tx.tournamentMatch.create({
            data: {
              tenantId,
              tournamentId: category.tournamentId,
              categoryId,
              groupId: group.id,
              stageLabel: "Grupos",
              round: matchday + 1,
              teamAId,
              teamBId,
            },
          });
        }
      }
    }
  });
}

/** Toma los mejores `qualifiersPerGroup` de cada grupo (por puntos) y arma la llave de eliminación. */
export async function generateKnockoutFromGroups(
  tenantId: string,
  categoryId: string,
  qualifiersPerGroup: number = 2,
) {
  return withTenant(tenantId, async (tx) => {
    const category = await tx.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { groups: { include: { standings: { include: { team: true } } } } },
    });
    if (!category) throw new Error("Categoría no encontrada");

    // Ranking por posición dentro del grupo (1ros, luego 2dos, ...), y dentro
    // de cada posición por puntos, para minimizar que dos del mismo grupo se
    // cricen antes de tiempo.
    const byRank: { id: string }[][] = [];
    for (const group of category.groups) {
      const ranked = [...group.standings].sort(
        (a, b) => b.points - a.points || b.setsWon - b.setsLost - (a.setsWon - a.setsLost) || b.gamesWon - a.gamesWon,
      );
      ranked.slice(0, qualifiersPerGroup).forEach((standing, rank) => {
        byRank[rank] = byRank[rank] ?? [];
        byRank[rank].push({ id: standing.teamId });
      });
    }
    const qualifiers = byRank.flat();

    return buildSingleEliminationBracket(tx, {
      tenantId,
      tournamentId: category.tournamentId,
      categoryId,
      teams: qualifiers,
    });
  });
}

// ---------------------------------------------------------------------------
// Americano — no hay pareja fija: cada ronda se sortean parejas nuevas entre
// todos los jugadores inscriptos (TournamentParticipant) y se generan
// TournamentTeam efímeros (roundGenerated) solo para esa ronda. Los puntos
// se calculan agregando por jugador en getAmericanoStandings, no se
// almacenan en una columna aparte.
// ---------------------------------------------------------------------------

export async function generateAmericanoRound(tenantId: string, categoryId: string) {
  return withTenant(tenantId, async (tx) => {
    const [participants, lastMatch] = await Promise.all([
      tx.tournamentParticipant.findMany({ where: { categoryId } }),
      tx.tournamentMatch.findFirst({ where: { categoryId, groupId: null }, orderBy: { round: "desc" } }),
    ]);
    if (participants.length < 4) throw new Error("Hacen falta al menos 4 jugadores para una ronda de Americano");

    const round = (lastMatch?.round ?? 0) + 1;
    const shuffled = shuffle(participants);
    if (shuffled.length % 2 !== 0) shuffled.pop(); // el último queda libre esta ronda

    const teams: { id: string }[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const team = await tx.tournamentTeam.create({
        data: {
          tenantId,
          categoryId,
          name: `${shuffled[i].name} / ${shuffled[i + 1].name}`,
          roundGenerated: round,
        },
      });
      await tx.tournamentTeamMember.createMany({
        data: [
          { teamId: team.id, participantId: shuffled[i].id },
          { teamId: team.id, participantId: shuffled[i + 1].id },
        ],
      });
      teams.push(team);
    }

    const category = await tx.tournamentCategory.findUniqueOrThrow({ where: { id: categoryId } });
    const shuffledTeams = shuffle(teams);
    for (let i = 0; i + 1 < shuffledTeams.length; i += 2) {
      await tx.tournamentMatch.create({
        data: {
          tenantId,
          tournamentId: category.tournamentId,
          categoryId,
          stageLabel: `Ronda ${round}`,
          round,
          teamAId: shuffledTeams[i].id,
          teamBId: shuffledTeams[i + 1].id,
        },
      });
    }
  });
}

export async function getAmericanoStandings(tenantId: string, categoryId: string) {
  return withTenant(tenantId, async (tx) => {
    const matches = await tx.tournamentMatch.findMany({
      where: { categoryId, groupId: null, status: { in: ["COMPLETED", "WALKOVER"] } },
      include: {
        teamA: { include: { members: { include: { participant: true } } } },
        teamB: { include: { members: { include: { participant: true } } } },
      },
    });

    const stats = new Map<string, { name: string; matchesPlayed: number; gamesWon: number; gamesLost: number }>();
    const bump = (participantId: string, name: string, won: number, lost: number) => {
      const s = stats.get(participantId) ?? { name, matchesPlayed: 0, gamesWon: 0, gamesLost: 0 };
      s.matchesPlayed += 1;
      s.gamesWon += won;
      s.gamesLost += lost;
      stats.set(participantId, s);
    };

    for (const m of matches) {
      const gamesA = m.scoreA.reduce((a, b) => a + b, 0);
      const gamesB = m.scoreB.reduce((a, b) => a + b, 0);
      for (const member of m.teamA?.members ?? []) bump(member.participantId, member.participant.name, gamesA, gamesB);
      for (const member of m.teamB?.members ?? []) bump(member.participantId, member.participant.name, gamesB, gamesA);
    }

    return [...stats.entries()]
      .map(([participantId, s]) => ({ participantId, ...s }))
      .sort((a, b) => b.gamesWon - a.gamesWon);
  });
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

async function recomputeGroupStandings(tx: Prisma.TransactionClient, groupId: string) {
  const [standings, matches] = await Promise.all([
    tx.tournamentGroupStanding.findMany({ where: { groupId } }),
    tx.tournamentMatch.findMany({ where: { groupId, status: { in: ["COMPLETED", "WALKOVER"] } } }),
  ]);

  const totals = new Map<
    string,
    { played: number; won: number; lost: number; setsWon: number; setsLost: number; gamesWon: number; gamesLost: number }
  >();
  for (const s of standings) {
    totals.set(s.teamId, { played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 });
  }

  const applyMatch = (
    teamId: string | null,
    won: boolean,
    setsWon: number,
    setsLost: number,
    gamesWon: number,
    gamesLost: number,
  ) => {
    if (!teamId || !totals.has(teamId)) return;
    const t = totals.get(teamId)!;
    t.played += 1;
    if (won) t.won += 1;
    else t.lost += 1;
    t.setsWon += setsWon;
    t.setsLost += setsLost;
    t.gamesWon += gamesWon;
    t.gamesLost += gamesLost;
  };

  for (const m of matches) {
    const gamesA = m.scoreA.reduce((a, b) => a + b, 0);
    const gamesB = m.scoreB.reduce((a, b) => a + b, 0);
    const setsA = m.scoreA.filter((v, i) => v > (m.scoreB[i] ?? 0)).length;
    const setsB = m.scoreB.filter((v, i) => v > (m.scoreA[i] ?? 0)).length;
    applyMatch(m.teamAId, m.winnerTeamId === m.teamAId, setsA, setsB, gamesA, gamesB);
    applyMatch(m.teamBId, m.winnerTeamId === m.teamBId, setsB, setsA, gamesB, gamesA);
  }

  await Promise.all(
    standings.map((s) => {
      const t = totals.get(s.teamId)!;
      return tx.tournamentGroupStanding.update({
        where: { id: s.id },
        data: { ...t, points: t.won * 2 }, // 2 puntos por partido ganado — ajustar acá si el club usa otro criterio
      });
    }),
  );
}

export async function recordMatchResult(
  tenantId: string,
  input: { matchId: string; scoreA: number[]; scoreB: number[]; winnerTeamId: string; walkover?: boolean },
) {
  return withTenant(tenantId, async (tx) => {
    const match = await tx.tournamentMatch.update({
      where: { id: input.matchId },
      data: {
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        winnerTeamId: input.winnerTeamId,
        status: input.walkover ? "WALKOVER" : "COMPLETED",
      },
    });

    if (match.groupId) await recomputeGroupStandings(tx, match.groupId);

    if (match.nextMatchId && match.nextMatchSlot) {
      await tx.tournamentMatch.update({
        where: { id: match.nextMatchId },
        data: match.nextMatchSlot === "A" ? { teamAId: input.winnerTeamId } : { teamBId: input.winnerTeamId },
      });
    }

    return match;
  });
}

export async function updateMatchSchedule(tenantId: string, matchId: string, scheduledAt: Date | null) {
  return withTenant(tenantId, (tx) => tx.tournamentMatch.update({ where: { id: matchId }, data: { scheduledAt } }));
}

export async function getBracket(tenantId: string, categoryId: string) {
  return withTenant(tenantId, (tx) =>
    tx.tournamentMatch.findMany({
      where: { categoryId, groupId: null },
      include: { teamA: true, teamB: true, winnerTeam: true, court: true },
      orderBy: [{ round: "asc" }],
    }),
  );
}
