"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  generateSingleEliminationFixtureAction,
  generateGroupStageAction,
  generateKnockoutFromGroupsAction,
  generateAmericanoRoundAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FixtureActions({
  tenantSlug,
  tournamentId,
  categoryId,
  format,
  teamsCount,
  participantsCount,
  hasGroups,
  hasKnockoutMatches,
  hasSingleEliminationMatches,
}: {
  tenantSlug: string;
  tournamentId: string;
  categoryId: string;
  format: string;
  teamsCount: number;
  participantsCount: number;
  hasGroups: boolean;
  hasKnockoutMatches: boolean;
  hasSingleEliminationMatches: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [numGroups, setNumGroups] = useState("");
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState("2");

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success("Listo.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Ocurrió un error.");
      }
    });
  }

  if (format === "SINGLE_ELIMINATION") {
    if (hasSingleEliminationMatches) return null;
    return (
      <Button
        size="sm"
        disabled={isPending || teamsCount < 2}
        onClick={() => run(() => generateSingleEliminationFixtureAction(tenantSlug, tournamentId, categoryId))}
      >
        {isPending ? "Generando..." : "Generar cuadro"}
      </Button>
    );
  }

  if (format === "GROUPS_KNOCKOUT") {
    if (!hasGroups) {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            placeholder="Cant. de grupos (auto)"
            className="w-44"
            value={numGroups}
            onChange={(e) => setNumGroups(e.target.value)}
          />
          <Button
            size="sm"
            disabled={isPending || teamsCount < 2}
            onClick={() =>
              run(() =>
                generateGroupStageAction(tenantSlug, tournamentId, categoryId, numGroups ? Number(numGroups) : undefined),
              )
            }
          >
            {isPending ? "Armando..." : "Armar grupos"}
          </Button>
        </div>
      );
    }
    if (!hasKnockoutMatches) {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            className="w-56"
            value={qualifiersPerGroup}
            onChange={(e) => setQualifiersPerGroup(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">clasificados por grupo</span>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(() =>
                generateKnockoutFromGroupsAction(tenantSlug, tournamentId, categoryId, Number(qualifiersPerGroup) || 2),
              )
            }
          >
            {isPending ? "Generando..." : "Generar cuadro de eliminación"}
          </Button>
        </div>
      );
    }
    return null;
  }

  if (format === "AMERICANO") {
    return (
      <Button
        size="sm"
        disabled={isPending || participantsCount < 4}
        onClick={() => run(() => generateAmericanoRoundAction(tenantSlug, tournamentId, categoryId))}
      >
        {isPending ? "Generando..." : "Generar nueva ronda"}
      </Button>
    );
  }

  return null;
}
