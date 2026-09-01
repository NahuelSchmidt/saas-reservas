"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createPricingRuleAction, updatePricingRuleAction } from "./actions";
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

type ExistingRule = {
  id: string;
  courtId: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  clientType: string;
  priceCents: number;
};

export function PricingRuleForm({
  tenantSlug,
  courts,
  rule,
}: {
  tenantSlug: string;
  courts: { id: string; name: string }[];
  /** Si se pasa, el diálogo edita esta regla existente en vez de crear una nueva. */
  rule?: ExistingRule;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(rule);

  const [courtId, setCourtId] = useState(rule?.courtId ?? "ALL");
  const [dayOfWeek, setDayOfWeek] = useState(rule?.dayOfWeek != null ? String(rule.dayOfWeek) : "ALL");
  const [clientType, setClientType] = useState(rule?.clientType ?? "ANY");

  const courtLabel = courtId === "ALL" ? "Todas las canchas" : courts.find((c) => c.id === courtId)?.name ?? "Todas las canchas";
  const dayLabel = dayOfWeek === "ALL" ? "Todos los días" : DAY_LABEL[Number(dayOfWeek)];
  const clientTypeLabel = clientType === "MEMBER" ? "Socios" : clientType === "NON_MEMBER" ? "No socios" : "Todos";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updatePricingRuleAction(tenantSlug, rule!.id, formData)
        : await createPricingRuleAction(tenantSlug, formData);
      if (result.ok) {
        toast.success(isEdit ? "Regla actualizada." : "Regla de precio creada.");
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
            <Button variant="ghost" size="icon-sm" aria-label="Editar regla" className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button>Nueva regla de precio</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar regla de precio" : "Nueva regla de precio"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="courtId">Cancha</Label>
              <Select name="courtId" value={courtId} onValueChange={(v) => v && setCourtId(v)}>
                <SelectTrigger id="courtId"><SelectValue>{courtLabel}</SelectValue></SelectTrigger>
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
              <Select name="dayOfWeek" value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
                <SelectTrigger id="dayOfWeek"><SelectValue>{dayLabel}</SelectValue></SelectTrigger>
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
              <Input id="startTime" name="startTime" type="time" required defaultValue={rule?.startTime ?? "08:00"} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endTime">Hasta</Label>
              <Input id="endTime" name="endTime" type="time" required defaultValue={rule?.endTime ?? "23:00"} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientType">Tipo de cliente</Label>
            <Select name="clientType" value={clientType} onValueChange={(v) => v && setClientType(v)}>
              <SelectTrigger id="clientType"><SelectValue>{clientTypeLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Todos</SelectItem>
                <SelectItem value="MEMBER">Socios</SelectItem>
                <SelectItem value="NON_MEMBER">No socios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceARS">Precio (ARS)</Label>
            <Input
              id="priceARS"
              name="priceARS"
              type="number"
              min={0}
              step={100}
              required
              defaultValue={rule ? rule.priceCents / 100 : undefined}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear regla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
