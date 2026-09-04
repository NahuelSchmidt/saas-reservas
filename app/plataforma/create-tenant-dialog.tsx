"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTenantAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CreateTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTenantAction(formData);
      if (result.ok) {
        toast.success(`Complejo creado: /${result.data.slug}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo complejo</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo complejo</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre del complejo</Label>
            <Input id="name" name="name" required placeholder="Club Demo Pádel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" name="slug" required placeholder="club-demo" pattern="[a-z0-9-]+" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminName">Nombre del admin del complejo</Label>
            <Input id="adminName" name="adminName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminEmail">Email del admin del complejo</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminPassword">Contraseña para el admin</Label>
            <Input id="adminPassword" name="adminPassword" type="text" required minLength={6} placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-muted-foreground">Se la pasás vos por fuera (WhatsApp, email). Puede cambiarla después.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear complejo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
