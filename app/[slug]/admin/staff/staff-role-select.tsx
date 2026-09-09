"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStaffRoleAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
  INSTRUCTOR: "Instructor",
};

type Role = "ADMIN" | "EMPLOYEE" | "INSTRUCTOR";

export function StaffRoleSelect({
  tenantSlug,
  membershipId,
  role,
}: {
  tenantSlug: string;
  membershipId: string;
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      const result = await updateStaffRoleAction(tenantSlug, membershipId, value as Role);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <Select defaultValue={role} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(ROLE_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
