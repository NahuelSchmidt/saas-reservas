import { notFound } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { getTournament, getAmericanoStandings } from "@/lib/tournaments/service";
import { formatCentsARS } from "@/lib/availability/engine";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BracketGrid } from "@/components/tournaments/bracket-grid";
import { TournamentStatusSelect } from "../tournament-status-select";
import { CategoryFormDialog } from "./category-form-dialog";
import { RegisterDialog } from "./register-dialog";
import { FixtureActions } from "./fixture-actions";
import { MatchResultDialog, type MatchData } from "./match-result-dialog";
import { MatchScheduleInput } from "./match-schedule-input";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + eliminación",
  AMERICANO: "Americano",
};

function groupByRound<T extends { round: number }>(matches: T[]): [number, T[]][] {
  const byRound = new Map<number, T[]>();
  for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
  return [...byRound.entries()].sort(([a], [b]) => a - b);
}

function MatchRow({
  tenantSlug,
  tournamentId,
  match,
  courts,
}: {
  tenantSlug: string;
  tournamentId: string;
  match: MatchData;
  courts: { id: string; name: string }[];
}) {
  const played = match.status === "COMPLETED" || match.status === "WALKOVER";
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col text-sm">
          <span className="text-xs text-muted-foreground">{match.stageLabel}</span>
          <span>
            <span className={match.winnerTeam?.id === match.teamA?.id ? "font-semibold" : ""}>{match.teamA?.name ?? "Por definir"}</span>
            {" vs "}
            <span className={match.winnerTeam?.id === match.teamB?.id ? "font-semibold" : ""}>{match.teamB?.name ?? "Por definir"}</span>
          </span>
          {played && (
            <span className="text-xs text-muted-foreground">
              {match.status === "WALKOVER" ? "Walkover — " : ""}
              {match.scoreA.map((a, i) => `${a}-${match.scoreB[i] ?? 0}`).join(", ")}
            </span>
          )}
        </div>
        <MatchResultDialog tenantSlug={tenantSlug} tournamentId={tournamentId} match={match} />
      </div>
      <MatchScheduleInput
        tenantSlug={tenantSlug}
        tournamentId={tournamentId}
        matchId={match.id}
        scheduledAt={match.scheduledAt}
        courtId={match.courtId}
        courts={courts}
      />
    </div>
  );
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; tournamentId: string }>;
}) {
  const { slug, tournamentId } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const [tournament, courts] = await Promise.all([
    getTournament(tenant.id, tournamentId),
    withTenant(tenant.id, (tx) =>
      tx.court.findMany({ where: { tenantId: tenant.id, status: { not: "INACTIVE" } }, orderBy: { name: "asc" } }),
    ),
  ]);
  if (!tournament) notFound();

  const isAmericano = tournament.format === "AMERICANO";
  const americanoStandingsByCategory = isAmericano
    ? await Promise.all(tournament.categories.map((c) => getAmericanoStandings(tenant.id, c.id)))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            {FORMAT_LABEL[tournament.format]} · Desde el {tournament.startDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}
            {tournament.endDate && ` hasta el ${tournament.endDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}`}
            {tournament.registrationFeeCents > 0 && ` · Inscripción: ${formatCentsARS(tournament.registrationFeeCents)}`}
          </p>
          {tournament.description && <p className="mt-1 text-sm text-muted-foreground">{tournament.description}</p>}
        </div>
        <TournamentStatusSelect tenantSlug={tenant.slug} tournamentId={tournament.id} status={tournament.status} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categorías</h2>
        <CategoryFormDialog tenantSlug={tenant.slug} tournamentId={tournament.id} />
      </div>

      {tournament.categories.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no creaste categorías para este torneo.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {tournament.categories.map((category, categoryIndex) => {
            const knockoutMatches = category.matches.filter((m) => m.groupId === null);
            const hasGroups = category.groups.length > 0;
            const hasKnockoutMatches = knockoutMatches.length > 0;

            return (
              <div key={category.id} className="flex flex-col gap-4 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold">{category.name}</h3>
                    <Badge variant="secondary">
                      {isAmericano ? `${category.participants.length} jugadores` : `${category.teams.length} equipos`}
                      {category.maxTeams ? ` / ${category.maxTeams}` : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <RegisterDialog
                      tenantSlug={tenant.slug}
                      tournamentId={tournament.id}
                      categoryId={category.id}
                      isAmericano={isAmericano}
                    />
                    <FixtureActions
                      tenantSlug={tenant.slug}
                      tournamentId={tournament.id}
                      categoryId={category.id}
                      format={tournament.format}
                      teamsCount={category.teams.length}
                      participantsCount={category.participants.length}
                      hasGroups={hasGroups}
                      hasKnockoutMatches={hasKnockoutMatches}
                      hasSingleEliminationMatches={category.matches.length > 0}
                    />
                  </div>
                </div>

                {!isAmericano && category.teams.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no hay parejas inscriptas.</p>
                )}
                {isAmericano && category.participants.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no hay jugadores inscriptos.</p>
                )}

                {tournament.format === "GROUPS_KNOCKOUT" && category.groups.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {category.groups.map((group) => (
                      <div key={group.id} className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold">{group.name}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Equipo</TableHead>
                              <TableHead>PJ</TableHead>
                              <TableHead>G</TableHead>
                              <TableHead>P</TableHead>
                              <TableHead>Sets</TableHead>
                              <TableHead>Games</TableHead>
                              <TableHead>Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.standings.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.team.name}</TableCell>
                                <TableCell>{s.played}</TableCell>
                                <TableCell>{s.won}</TableCell>
                                <TableCell>{s.lost}</TableCell>
                                <TableCell>{s.setsWon}-{s.setsLost}</TableCell>
                                <TableCell>{s.gamesWon}-{s.gamesLost}</TableCell>
                                <TableCell className="font-semibold">{s.points}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex flex-col gap-1.5">
                          {category.matches
                            .filter((m) => m.groupId === group.id)
                            .map((m) => (
                              <MatchRow key={m.id} tenantSlug={tenant.slug} tournamentId={tournament.id} match={m} courts={courts} />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(tournament.format === "SINGLE_ELIMINATION" || (tournament.format === "GROUPS_KNOCKOUT" && hasKnockoutMatches)) &&
                  knockoutMatches.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {tournament.format === "GROUPS_KNOCKOUT" && <h4 className="text-sm font-semibold">Eliminación directa</h4>}
                    <BracketGrid
                      matches={knockoutMatches}
                      renderMatch={(m) => <MatchRow tenantSlug={tenant.slug} tournamentId={tournament.id} match={m} courts={courts} />}
                    />
                  </div>
                )}

                {isAmericano && (
                  <div className="flex flex-col gap-4">
                    {category.matches.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {groupByRound(category.matches).map(([round, matches]) => (
                          <div key={round} className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">Ronda {round}</span>
                            {matches.map((m) => (
                              <MatchRow key={m.id} tenantSlug={tenant.slug} tournamentId={tournament.id} match={m} courts={courts} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {americanoStandingsByCategory[categoryIndex]?.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold">Posiciones (games ganados)</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Jugador</TableHead>
                              <TableHead>Partidos</TableHead>
                              <TableHead>Games</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {americanoStandingsByCategory[categoryIndex].map((s) => (
                              <TableRow key={s.participantId}>
                                <TableCell className="font-medium">{s.name}</TableCell>
                                <TableCell>{s.matchesPlayed}</TableCell>
                                <TableCell className="font-semibold">{s.gamesWon}-{s.gamesLost}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
