import { notFound } from "next/navigation";
import { Clock, MapPin, CheckCircle2, Radio, ChevronDown } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getTournament, getAmericanoStandings } from "@/lib/tournaments/service";
import { classifyMatchTimeStatus } from "@/lib/tournaments/match-status";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BracketGrid } from "@/components/tournaments/bracket-grid";
import { CategoryViewTabs } from "./category-view-tabs";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + eliminación",
  AMERICANO: "Americano",
};

type PublicMatch = {
  id: string;
  round: number;
  stageLabel: string;
  scoreA: number[];
  scoreB: number[];
  status: string;
  scheduledAt: Date | null;
  court: { name: string } | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  winnerTeam: { id: string; name: string } | null;
};

function groupByRound(matches: PublicMatch[]): [number, PublicMatch[]][] {
  const byRound = new Map<number, PublicMatch[]>();
  for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
  return [...byRound.entries()].sort(([a], [b]) => a - b);
}

/**
 * En lo público solo se ve el fixture (quién juega contra quién) — el
 * resultado y los datos de cancha/horario quedan adentro de un
 * `<details>` nativo, así se ve al tocar el partido, sin JS ni un dialog.
 */
function MatchRow({ match }: { match: PublicMatch }) {
  const timeStatus = classifyMatchTimeStatus(match);
  const played = timeStatus === "PLAYED";
  const borderColor =
    timeStatus === "LIVE" ? "border-l-emerald-500" : played ? "border-l-border" : "border-l-primary/40";

  return (
    <details className={`group rounded-lg border border-l-4 ${borderColor} bg-card px-3 py-2.5 text-sm shadow-sm`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">{match.stageLabel}</span>
          <span>
            <span className={match.winnerTeam?.id === match.teamA?.id ? "font-semibold" : ""}>{match.teamA?.name ?? "Por definir"}</span>
            {" vs "}
            <span className={match.winnerTeam?.id === match.teamB?.id ? "font-semibold" : ""}>{match.teamB?.name ?? "Por definir"}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {timeStatus === "LIVE" && (
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              <Radio className="size-3 animate-pulse" /> En juego
            </Badge>
          )}
          {played && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3" /> Jugado
            </Badge>
          )}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
        {played ? (
          <p className="text-xs font-medium">
            {match.status === "WALKOVER" ? "Walkover — " : ""}
            {match.scoreA.map((a, i) => `${a}-${match.scoreB[i] ?? 0}`).join(", ")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Todavía no hay resultado.</p>
        )}
        {(match.scheduledAt || match.court) && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-foreground/80">
            {match.scheduledAt && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {match.scheduledAt.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })}{" "}
                {match.scheduledAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {match.court && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {match.court.name}
              </span>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export default async function PublicTournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; tournamentId: string }>;
}) {
  const { slug, tournamentId } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const tournament = await getTournament(tenant.id, tournamentId);
  if (!tournament || tournament.status === "DRAFT") notFound();

  const isAmericano = tournament.format === "AMERICANO";
  const americanoStandingsByCategory = isAmericano
    ? await Promise.all(tournament.categories.map((c) => getAmericanoStandings(tenant.id, c.id)))
    : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground">
          {FORMAT_LABEL[tournament.format]} · Desde el {tournament.startDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}
          {tournament.endDate && ` hasta el ${tournament.endDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}`}
        </p>
        {tournament.description && <p className="mt-1 text-sm text-muted-foreground">{tournament.description}</p>}
      </div>

      {tournament.categories.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no hay categorías cargadas.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {tournament.categories.map((category, categoryIndex) => {
            const knockoutMatches = category.matches.filter((m) => m.groupId === null);

            return (
              <div key={category.id} className="flex flex-col gap-4 rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-bold">{category.name}</h2>
                  <Badge variant="secondary">
                    {isAmericano ? `${category.participants.length} jugadores` : `${category.teams.length} equipos`}
                  </Badge>
                </div>

                {tournament.format === "GROUPS_KNOCKOUT" && category.groups.length > 0 && (
                  <CategoryViewTabs
                    defaultTab="bracket"
                    bracket={
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                          {category.groups.map((group) => (
                            <div key={group.id} className="flex flex-col gap-2">
                              <h3 className="text-sm font-semibold">{group.name}</h3>
                              <div className="flex flex-col gap-1.5">
                                {category.matches.filter((m) => m.groupId === group.id).map((m) => (
                                  <MatchRow key={m.id} match={m} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {knockoutMatches.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold">Eliminación directa</h3>
                            <BracketGrid matches={knockoutMatches} renderMatch={(m) => <MatchRow match={m} />} />
                          </div>
                        ) : (
                          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                            El cuadro de eliminación se arma cuando termina la fase de grupos.
                          </p>
                        )}
                      </div>
                    }
                    groups={
                      <div className="flex flex-col gap-4">
                        {category.groups.map((group) => (
                          <div key={group.id} className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold">{group.name}</h3>
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
                          </div>
                        ))}
                      </div>
                    }
                  />
                )}

                {knockoutMatches.length > 0 && !isAmericano && tournament.format !== "GROUPS_KNOCKOUT" && (
                  <div className="flex flex-col gap-3">
                    <BracketGrid matches={knockoutMatches} renderMatch={(m) => <MatchRow match={m} />} />
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
                              <MatchRow key={m.id} match={m} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {americanoStandingsByCategory[categoryIndex]?.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">Posiciones (games ganados)</h3>
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

                {tournament.format === "SINGLE_ELIMINATION" && knockoutMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground">El cuadro todavía no se generó.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
