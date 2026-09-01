"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStockAction } from "./actions";
import { Input } from "@/components/ui/input";

export function StockInput({ tenantSlug, productId, stock }: { tenantSlug: string; productId: string; stock: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0 || next === stock) {
      setValue(String(stock));
      return;
    }
    startTransition(async () => {
      const result = await updateStockAction(tenantSlug, productId, next);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
        setValue(String(stock));
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Stock:</span>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        type="number"
        min={0}
        disabled={isPending}
        className="h-7 w-16 text-sm"
      />
    </div>
  );
}
