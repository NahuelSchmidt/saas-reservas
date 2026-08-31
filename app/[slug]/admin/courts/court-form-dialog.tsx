"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCourtAction } from "./actions";
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

export function CourtFormDialog({ tenantSlug }: { tenantSlug: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCourtAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Cancha creada.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nueva cancha</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cancha</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Cancha 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select name="type" defaultValue="DOUBLES">
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOUBLES">Dobles</SelectItem>
                  <SelectItem value="SINGLES">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Ubicación</Label>
              <Select name="location" defaultValue="OUTDOOR">
                <SelectTrigger id="location"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                  <SelectItem value="INDOOR">Indoor</SelectItem>
                  <SelectItem value="PANORAMIC">Panorámica</SelectItem>
                  <SelectItem value="COVERED">Con techo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="surface">Superficie</Label>
            <Input id="surface" name="surface" placeholder="Césped sintético" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">Capacidad</Label>
            <Input id="capacity" name="capacity" type="number" min={1} max={8} defaultValue={4} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasLighting" className="h-4 w-4" />
            Tiene iluminación
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear cancha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
