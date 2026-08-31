"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPricingRuleAction } from "./actions";
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

const DAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function PricingRuleForm({
  tenantSlug,
  courts,
}: {
  tenantSlug: string;
  courts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPricingRuleAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Regla de precio creada.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nueva regla de precio</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla de precio</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="courtId">Cancha</Label>
              <Select name="courtId" defaultValue="ALL">
                <SelectTrigger id="courtId"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las canchas</SelectItem>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dayOfWeek">Día</Label>
              <Select name="dayOfWeek" defaultValue="ALL">
                <SelectTrigger id="dayOfWeek"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los días</SelectItem>
                  {DAY_LABEL.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startTime">Desde</Label>
              <Input id="startTime" name="startTime" type="time" required defaultValue="08:00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endTime">Hasta</Label>
              <Input id="endTime" name="endTime" type="time" required defaultValue="23:00" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientType">Tipo de cliente</Label>
            <Select name="clientType" defaultValue="ANY">
              <SelectTrigger id="clientType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Todos</SelectItem>
                <SelectItem value="MEMBER">Socios</SelectItem>
                <SelectItem value="NON_MEMBER">No socios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceARS">Precio (ARS)</Label>
            <Input id="priceARS" name="priceARS" type="number" min={0} step={100} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear regla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
