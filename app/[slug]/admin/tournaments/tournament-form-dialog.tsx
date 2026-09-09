"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTournamentAction } from "./actions";
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

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + eliminación",
  AMERICANO: "Americano",
};

export function TournamentFormDialog({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [format, setFormat] = useState("SINGLE_ELIMINATION");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTournamentAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Torneo creado.");
        setOpen(false);
        router.refresh();
        router.push(`/${tenantSlug}/admin/tournaments/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo torneo</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo torneo</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Torneo de primavera" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="format">Formato</Label>
            <Select name="format" value={format} onValueChange={(v) => v && setFormat(v)}>
              <SelectTrigger id="format"><SelectValue>{FORMAT_LABEL[format]}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(FORMAT_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">No se puede cambiar una vez creado el torneo.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registrationFeeARS">Costo de inscripción (ARS, opcional)</Label>
              <Input id="registrationFeeARS" name="registrationFeeARS" type="number" min={0} step={100} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxTeamsPerCategory">Máx. equipos por categoría (opcional)</Label>
              <Input id="maxTeamsPerCategory" name="maxTeamsPerCategory" type="number" min={1} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" name="description" placeholder="Categorías, premios, reglas especiales..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear torneo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
