"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createInstructorAction, updateInstructorAction } from "./actions";
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

type ExistingInstructor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  commissionPct: number | null;
  userId: string | null;
};

export function InstructorFormDialog({
  tenantSlug,
  staffUsers,
  instructor,
}: {
  tenantSlug: string;
  staffUsers: { id: string; name: string; email: string }[];
  /** Si se pasa, el diálogo edita este instructor en vez de crear uno nuevo. */
  instructor?: ExistingInstructor;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(instructor);

  const [userId, setUserId] = useState(instructor?.userId ?? "EXTERNAL");
  const userLabel = userId === "EXTERNAL" ? "Profesor externo (sin cuenta)" : staffUsers.find((u) => u.id === userId)?.name ?? "Profesor externo (sin cuenta)";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateInstructorAction(tenantSlug, instructor!.id, formData)
        : await createInstructorAction(tenantSlug, formData);
      if (result.ok) {
        toast.success(isEdit ? "Instructor actualizado." : "Instructor creado.");
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
          isEdit ? (
            <Button variant="ghost" size="icon-sm" aria-label="Editar instructor" className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button>Nuevo instructor</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar instructor" : "Nuevo instructor"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required defaultValue={instructor?.name} placeholder="Profe Juan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={instructor?.phone ?? ""} placeholder="11 2345 6789" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={instructor?.email ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="userId">Es staff interno de</Label>
            <Select name="userId" value={userId} onValueChange={(v) => v && setUserId(v)}>
              <SelectTrigger id="userId"><SelectValue>{userLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXTERNAL">Profesor externo (sin cuenta)</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commissionPct">Comisión (% por clase dictada)</Label>
            <Input
              id="commissionPct"
              name="commissionPct"
              type="number"
              min={0}
              max={100}
              placeholder="Dejar vacío si no cobra comisión"
              defaultValue={instructor?.commissionPct ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio (opcional)</Label>
            <Input id="bio" name="bio" defaultValue={instructor?.bio ?? ""} placeholder="Profesor de nivel 3-4, especialista en saque" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear instructor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
