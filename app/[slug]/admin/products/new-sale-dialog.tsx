"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { createSaleAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Product = { id: string; name: string; priceCents: number; stock: number };

export function NewSaleDialog({ tenantSlug, products }: { tenantSlug: string; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
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
      const result = await createSaleAction(tenantSlug, items);
      if (result.ok) {
        toast.success("Venta registrada.");
        setCart({});
        setOpen(false);
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

        <DialogFooter>
          <Button onClick={submit} disabled={isPending || itemCount === 0}>
            {isPending ? "Registrando..." : "Cobrar en efectivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
