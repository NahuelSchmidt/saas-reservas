"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { removeStaffAction } from "./actions";
import { Button } from "@/components/ui/button";

export function RemoveStaffButton({
  tenantSlug,
  membershipId,
  name,
}: {
  tenantSlug: string;
  membershipId: string;
  name: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Sacar a ${name} del staff? Pierde el acceso al panel.`)) return;
    startTransition(async () => {
      const result = await removeStaffAction(tenantSlug, membershipId);
      if (result.ok) {
        toast.success("Cuenta removida del staff.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" aria-label="Sacar del staff" disabled={isPending} onClick={handleClick}>
      <X className="size-4" />
    </Button>
  );
}
