"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updateStaffAction } from "./actions";
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

export function StaffEditDialog({
  tenantSlug,
  membershipId,
  name,
  email,
}: {
  tenantSlug: string;
  membershipId: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateStaffAction(tenantSlug, membershipId, formData);
      if (result.ok) {
        toast.success("Cuenta actualizada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Editar cuenta" className="text-muted-foreground hover:text-foreground">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cuenta de staff</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required defaultValue={name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña nueva (opcional)</Label>
            <Input id="password" name="password" type="text" minLength={6} placeholder="Dejar vacío para no cambiarla" />
            <p className="text-xs text-muted-foreground">Usalo si se olvidó la contraseña. Se la pasás vos por fuera.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
