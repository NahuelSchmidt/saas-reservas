"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCourtAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  MAINTENANCE: "Mantenimiento",
  INACTIVE: "Inactiva",
};

export function CourtStatusSelect({
  tenantSlug,
  courtId,
  status,
}: {
  tenantSlug: string;
  courtId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", value);
      const result = await updateCourtAction(tenantSlug, courtId, formData);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
