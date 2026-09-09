"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTournamentStatusAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  REGISTRATION_OPEN: "Inscripción abierta",
  IN_PROGRESS: "En curso",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

type Status = "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export function TournamentStatusSelect({
  tenantSlug,
  tournamentId,
  status,
}: {
  tenantSlug: string;
  tournamentId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      const result = await updateTournamentStatusAction(tenantSlug, tournamentId, value as Status);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-44" size="sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
