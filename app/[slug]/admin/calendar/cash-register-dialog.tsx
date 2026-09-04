"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { closeCashRegisterAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Close = {
  countedCashCents: number;
  expectedCashCents: number;
  differenceCents: number;
  createdAt: Date;
  closedBy: { name: string };
} | null;

export function CashRegisterDialog({
  tenantSlug,
  dateISO,
  expectedCashCents,
  close,
}: {
  tenantSlug: string;
  dateISO: string;
  expectedCashCents: number;
  close: Close;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [countedARS, setCountedARS] = useState(String(expectedCashCents / 100));
  const [notes, setNotes] = useState("");

  const differenceCents = useMemo(
    () => Math.round((Number(countedARS) || 0) * 100) - expectedCashCents,
    [countedARS, expectedCashCents],
  );

  if (close) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
        <Lock className="size-4 shrink-0" />
        <span>
          Caja cerrada por <strong>{close.closedBy.name}</strong> a las{" "}
          {new Date(close.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · Diferencia:{" "}
          <strong className={close.differenceCents !== 0 ? "text-orange-600" : ""}>{formatCentsARS(close.differenceCents)}</strong>
        </span>
      </div>
    );
  }

  function handleClose(formData: FormData) {
    formData.set("date", dateISO);
    formData.set("countedCashARS", countedARS);
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await closeCashRegisterAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Caja cerrada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Lock className="size-3.5" /> Cerrar caja
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja del día</DialogTitle>
          </DialogHeader>
          <form action={handleClose} className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Efectivo esperado (según el sistema)</span>
              <span className="font-medium">{formatCentsARS(expectedCashCents)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="countedCashARS">Efectivo contado (ARS)</Label>
              <Input
                id="countedCashARS"
                type="number"
                min={0}
                step={100}
                required
                value={countedARS}
                onChange={(e) => setCountedARS(e.target.value)}
              />
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Diferencia</span>
              <span className={`font-semibold ${differenceCents === 0 ? "text-emerald-600" : "text-orange-600"}`}>
                {formatCentsARS(differenceCents)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: faltaron $500 de un vuelto" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Cerrando..." : "Cerrar caja"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
