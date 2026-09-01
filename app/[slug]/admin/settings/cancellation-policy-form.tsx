"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCancellationPolicyAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Policy = {
  hoursBeforeFullRefund: number;
  hoursBeforePartialRefund: number;
  partialRefundPct: number;
} | null;

export function CancellationPolicyForm({ tenantSlug, policy }: { tenantSlug: string; policy: Policy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCancellationPolicyAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Política guardada.");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hoursBeforeFullRefund">Reembolso total si cancela con (hs)</Label>
          <Input id="hoursBeforeFullRefund" name="hoursBeforeFullRefund" type="number" min={0} defaultValue={policy?.hoursBeforeFullRefund ?? 24} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hoursBeforePartialRefund">Reembolso parcial si cancela con (hs)</Label>
          <Input id="hoursBeforePartialRefund" name="hoursBeforePartialRefund" type="number" min={0} defaultValue={policy?.hoursBeforePartialRefund ?? 6} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partialRefundPct">% de reembolso parcial</Label>
          <Input id="partialRefundPct" name="partialRefundPct" type="number" min={0} max={100} defaultValue={policy?.partialRefundPct ?? 50} />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
