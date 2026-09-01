"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateBookingConfigAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Config = {
  slotDurationMinutes: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  depositRequired: boolean;
  depositIsPercentage: boolean;
  depositValue: number;
} | null;

export function BookingConfigForm({ tenantSlug, config }: { tenantSlug: string; config: Config }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateBookingConfigAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Configuración guardada.");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slotDurationMinutes">Duración del turno</Label>
          <Select name="slotDurationMinutes" defaultValue={String(config?.slotDurationMinutes ?? 90)}>
            <SelectTrigger id="slotDurationMinutes"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="60">60 minutos</SelectItem>
              <SelectItem value="90">90 minutos</SelectItem>
              <SelectItem value="120">120 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minAdvanceMinutes">Anticipación mínima (min)</Label>
          <Input id="minAdvanceMinutes" name="minAdvanceMinutes" type="number" min={0} defaultValue={config?.minAdvanceMinutes ?? 60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxAdvanceDays">Anticipación máxima (días)</Label>
          <Input id="maxAdvanceDays" name="maxAdvanceDays" type="number" min={1} defaultValue={config?.maxAdvanceDays ?? 14} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="depositRequired" defaultChecked={config?.depositRequired ?? true} className="h-4 w-4" />
        Requerir seña online para confirmar la reserva
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depositIsPercentage">Tipo de seña</Label>
          <Select name="depositIsPercentage" defaultValue={config?.depositIsPercentage === false ? "false" : "true"}>
            <SelectTrigger id="depositIsPercentage"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Porcentaje del total</SelectItem>
              <SelectItem value="false">Monto fijo (ARS)</SelectItem>
            </SelectContent>
          </Select>
          {/* El Select nativo de shadcn no serializa "on"/"off" como checkbox; usamos un select con select real */}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depositValue">Valor de la seña</Label>
          <Input id="depositValue" name="depositValue" type="number" min={1} defaultValue={config?.depositValue ?? 30} />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
