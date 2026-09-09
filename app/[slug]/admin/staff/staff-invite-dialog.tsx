"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteStaffAction } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador (todo el panel)",
  EMPLOYEE: "Empleado (todo el panel operativo)",
  INSTRUCTOR: "Instructor (solo sus clases)",
};

export function StaffInviteDialog({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState("INSTRUCTOR");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteStaffAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Cuenta creada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nueva cuenta de staff</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cuenta de staff</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Profe Diego" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="text" required minLength={6} placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-muted-foreground">Se la pasás vos por fuera (WhatsApp, email). Puede cambiarla después.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="role"><SelectValue>{ROLE_LABEL[role]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear cuenta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
