"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ProductFormDialog({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProductAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Producto creado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Nuevo producto</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Pelotas Head x3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priceARS">Precio (ARS)</Label>
              <Input id="priceARS" name="priceARS" type="number" min={0} step={50} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Stock inicial</Label>
              <Input id="stock" name="stock" type="number" min={0} defaultValue={0} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Categoría (opcional)</Label>
            <Input id="category" name="category" placeholder="Pelotas, bebidas, accesorios..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
