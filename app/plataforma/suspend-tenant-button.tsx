"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { suspendTenantAction } from "./actions";
import { Button } from "@/components/ui/button";

export function SuspendTenantButton({ tenantId, suspended }: { tenantId: string; suspended: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await suspendTenantAction(tenantId, !suspended);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending}>
      {suspended ? "Reactivar" : "Suspender"}
    </Button>
  );
}
