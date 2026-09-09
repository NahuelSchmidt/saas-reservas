"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCategoryAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CategoryFormDialog({ tenantSlug, tournamentId }: { tenantSlug: string; tournamentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCategoryAction(tenantSlug, tournamentId, formData);
      if (result.ok) {
        toast.success("Categoría creada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Nueva categoría</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="4ta Caballeros" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxTeams">Máx. equipos/jugadores (opcional)</Label>
            <Input id="maxTeams" name="maxTeams" type="number" min={1} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear categoría"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
