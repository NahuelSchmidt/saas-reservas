"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { updateMatchScheduleAction } from "../actions";

/** Convierte un Date a "YYYY-MM-DDTHH:mm" en horario LOCAL del navegador, el formato que espera un input datetime-local. */
function toDatetimeLocalValue(date: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MatchScheduleInput({
  tenantSlug,
  tournamentId,
  matchId,
  scheduledAt,
}: {
  tenantSlug: string;
  tournamentId: string;
  matchId: string;
  scheduledAt: Date | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateMatchScheduleAction(tenantSlug, tournamentId, matchId, value);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="size-3" />
      <input
        type="datetime-local"
        defaultValue={toDatetimeLocalValue(scheduledAt)}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-input focus:border-input focus:outline-none"
      />
    </label>
  );
}
