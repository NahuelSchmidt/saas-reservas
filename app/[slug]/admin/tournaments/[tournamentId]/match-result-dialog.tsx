"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordMatchResultAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MatchData = {
  id: string;
  stageLabel: string;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  scoreA: number[];
  scoreB: number[];
  winnerTeam: { id: string; name: string } | null;
  status: string;
  scheduledAt: Date | null;
};

export function MatchResultDialog({
  tenantSlug,
  tournamentId,
  match,
}: {
  tenantSlug: string;
  tournamentId: string;
  match: MatchData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sets, setSets] = useState<[string, string][]>([
    [match.scoreA[0]?.toString() ?? "", match.scoreB[0]?.toString() ?? ""],
    [match.scoreA[1]?.toString() ?? "", match.scoreB[1]?.toString() ?? ""],
    [match.scoreA[2]?.toString() ?? "", match.scoreB[2]?.toString() ?? ""],
  ]);
  const [walkover, setWalkover] = useState(match.status === "WALKOVER");
  // Ganador elegido a mano desde el <Select>; si es null, se usa el que
  // infieren los sets (ver impliedWinnerId más abajo).
  const [manualWinnerId, setManualWinnerId] = useState<string | null>(null);

  // El ganador se infiere de los sets cargados (quién ganó más sets, no de la
  // suma de games), para que no dependa de una selección manual desacoplada
  // del resultado — eso es lo que permitía elegir por error un ganador
  // distinto al que indican los sets. El <Select> queda editable solo para
  // casos ambiguos (empate en sets) o walkover, donde no hay resultado real
  // del que derivarlo.
  const impliedWinnerId = useMemo(() => {
    if (!match.teamA || !match.teamB) return null;
    let setsA = 0;
    let setsB = 0;
    for (const [a, b] of sets) {
      if (a === "" && b === "") continue;
      const numA = Number(a) || 0;
      const numB = Number(b) || 0;
      if (numA > numB) setsA += 1;
      else if (numB > numA) setsB += 1;
    }
    if (setsA === setsB) return null;
    return setsA > setsB ? match.teamA.id : match.teamB.id;
  }, [sets, match.teamA, match.teamB]);

  const winnerTeamId = manualWinnerId ?? (!walkover ? impliedWinnerId : null) ?? "";

  const canRecord = Boolean(match.teamA && match.teamB);
  const winnerLabel = winnerTeamId === match.teamA?.id ? match.teamA?.name : winnerTeamId === match.teamB?.id ? match.teamB?.name : "Elegí el ganador";
  const isPlayed = match.status === "COMPLETED" || match.status === "WALKOVER";

  function updateSet(index: number, side: 0 | 1, value: string) {
    setSets((prev) => {
      const next = [...prev] as [string, string][];
      next[index] = side === 0 ? [value, next[index][1]] : [next[index][0], value];
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    const filledSets = sets.filter(([a, b]) => a !== "" || b !== "");
    if (filledSets.length === 0 && !walkover) {
      toast.error("Cargá el resultado de al menos un set.");
      return;
    }
    const scoreA = (filledSets.length > 0 ? filledSets : [["0", "0"]]).map(([a]) => Number(a) || 0);
    const scoreB = (filledSets.length > 0 ? filledSets : [["0", "0"]]).map(([, b]) => Number(b) || 0);

    if (!winnerTeamId) {
      toast.error("Elegí quién ganó el partido.");
      return;
    }

    formData.set("matchId", match.id);
    formData.set("scoreA", JSON.stringify(scoreA));
    formData.set("scoreB", JSON.stringify(scoreB));
    formData.set("winnerTeamId", winnerTeamId);
    if (walkover) formData.set("walkover", "on");

    startTransition(async () => {
      const result = await recordMatchResultAction(tenantSlug, tournamentId, formData);
      if (result.ok) {
        toast.success("Resultado cargado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={isPlayed ? "outline" : "default"} size="sm" disabled={!canRecord}>
            {isPlayed ? "Editar resultado" : "Cargar resultado"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{match.stageLabel}: {match.teamA?.name ?? "?"} vs {match.teamB?.name ?? "?"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Sets (games por set)</Label>
            {sets.map((set, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  placeholder={`Set ${i + 1} — ${match.teamA?.name ?? "Equipo A"}`}
                  value={set[0]}
                  onChange={(e) => updateSet(i, 0, e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  max={20}
                  placeholder={`Set ${i + 1} — ${match.teamB?.name ?? "Equipo B"}`}
                  value={set[1]}
                  onChange={(e) => updateSet(i, 1, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="winnerTeamId">Ganador</Label>
            <Select value={winnerTeamId} onValueChange={(v) => v && setManualWinnerId(v)}>
              <SelectTrigger id="winnerTeamId"><SelectValue>{winnerLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                {match.teamA && <SelectItem value={match.teamA.id}>{match.teamA.name}</SelectItem>}
                {match.teamB && <SelectItem value={match.teamB.id}>{match.teamB.name}</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se completa solo según los sets cargados. Cambialo a mano solo para walkover o casos parejos.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} className="h-4 w-4" />
            Fue walkover (el rival no se presentó)
          </label>
          {isPlayed && (
            <Badge variant="secondary" className="w-fit">Ya tiene un resultado cargado — al guardar se reemplaza</Badge>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar resultado"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
