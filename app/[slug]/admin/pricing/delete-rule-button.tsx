"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deletePricingRuleAction } from "./actions";

export function DeleteRuleButton({ tenantSlug, ruleId }: { tenantSlug: string; ruleId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePricingRuleAction(tenantSlug, ruleId);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Eliminar regla"
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
