"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { createSaleAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Product = { id: string; name: string; priceCents: number; stock: number };

export function NewSaleDialog({ tenantSlug, products }: { tenantSlug: string; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [isPending, startTransition] = useTransition();

  const totalCents = useMemo(
    () =>
      products.reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.priceCents, 0),
    [cart, products],
  );
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  function setQty(productId: string, qty: number, maxStock: number) {
    setCart((c) => ({ ...c, [productId]: Math.max(0, Math.min(qty, maxStock)) }));
  }

  function submit() {
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    startTransition(async () => {
      const result = await createSaleAction(tenantSlug, items, method);
      if (result.ok) {
        toast.success("Venta registrada.");
        setCart({});
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2"><ShoppingCart className="size-4" /> Registrar venta</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay productos activos con stock.</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {products.map((p) => {
              const qty = cart[p.id] ?? 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{formatCentsARS(p.priceCents)} · Stock: {p.stock}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(p.id, qty - 1, p.stock)}
                      className="flex size-7 items-center justify-center rounded-full border hover:bg-muted"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(p.id, qty + 1, p.stock)}
                      disabled={qty >= p.stock}
                      className="flex size-7 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">{itemCount} {itemCount === 1 ? "producto" : "productos"}</span>
          <span className="font-heading text-xl font-bold">{formatCentsARS(totalCents)}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="saleMethod" className="text-xs text-muted-foreground">Método de pago</Label>
          <Select value={method} onValueChange={(v) => v && setMethod(v as "CASH" | "TRANSFER")}>
            <SelectTrigger id="saleMethod">
              <SelectValue>{method === "CASH" ? "Efectivo" : "Transferencia"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Efectivo</SelectItem>
              <SelectItem value="TRANSFER">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={isPending || itemCount === 0}>
            {isPending ? "Registrando..." : "Cobrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
