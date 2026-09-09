"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateInstructorAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InstructorActiveToggle({
  tenantSlug,
  instructorId,
  active,
}: {
  tenantSlug: string;
  instructorId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("active", value);
      const result = await updateInstructorAction(tenantSlug, instructorId, formData);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <Select defaultValue={active ? "true" : "false"} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-28" size="sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="true">Activo</SelectItem>
        <SelectItem value="false">Inactivo</SelectItem>
      </SelectContent>
    </Select>
  );
}
