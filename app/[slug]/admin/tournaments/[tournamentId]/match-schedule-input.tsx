"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, MapPin } from "lucide-react";
import { updateMatchScheduleAction } from "../actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  courtId,
  courts,
}: {
  tenantSlug: string;
  tournamentId: string;
  matchId: string;
  scheduledAt: Date | null;
  courtId: string | null;
  courts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localScheduledAt, setLocalScheduledAt] = useState(toDatetimeLocalValue(scheduledAt));
  const [localCourtId, setLocalCourtId] = useState(courtId ?? "");

  function save(next: { scheduledAtLocal?: string; courtId?: string | null }) {
    startTransition(async () => {
      const result = await updateMatchScheduleAction(tenantSlug, tournamentId, matchId, next);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <label className="flex items-center gap-1">
        <Clock className="size-3" />
        <input
          type="datetime-local"
          value={localScheduledAt}
          disabled={isPending}
          onChange={(e) => {
            setLocalScheduledAt(e.target.value);
            save({ scheduledAtLocal: e.target.value });
          }}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-input focus:border-input focus:outline-none"
        />
      </label>
      <Select
        value={localCourtId || "__none__"}
        onValueChange={(v) => {
          const next = v === "__none__" ? null : v;
          setLocalCourtId(next ?? "");
          save({ courtId: next });
        }}
      >
        <SelectTrigger size="sm" className="h-6 w-32 gap-1 border-transparent bg-transparent px-1 text-xs hover:border-input">
          <MapPin className="size-3" />
          <SelectValue placeholder="Cancha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sin cancha</SelectItem>
          {courts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
