"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createManualBookingAction, createBlockAction, createRecurringBookingAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DepositConfig = { depositRequired: boolean; depositIsPercentage: boolean; depositValue: number };

export function ManualBookingDialog({
  tenantSlug,
  courtId,
  startTime,
  endTime,
  defaultPriceCents,
  depositConfig,
  open,
  onOpenChange,
}: {
  tenantSlug: string;
  courtId: string;
  startTime: string;
  endTime: string;
  defaultPriceCents: number | null;
  depositConfig: DepositConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [priceARS, setPriceARS] = useState(defaultPriceCents != null ? String(defaultPriceCents / 100) : "");
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositMethod, setDepositMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [recurringPriceARS, setRecurringPriceARS] = useState(defaultPriceCents != null ? String(defaultPriceCents / 100) : "");
  const label = `${new Date(startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} – ${new Date(endTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
  const weekdayLabel = new Date(startTime).toLocaleDateString("es-AR", { weekday: "long" });

  const depositCents = useMemo(() => {
    const totalCents = Math.round((Number(priceARS) || 0) * 100);
    if (!depositConfig.depositRequired) return 0;
    return depositConfig.depositIsPercentage
      ? Math.round((totalCents * depositConfig.depositValue) / 100)
      : depositConfig.depositValue;
  }, [priceARS, depositConfig]);

  function handleBooking(formData: FormData) {
    formData.set("courtId", courtId);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    formData.set("totalPriceARS", priceARS);
    formData.set("markDepositPaid", depositPaid ? "on" : "");
    formData.set("depositMethod", depositMethod);
    startTransition(async () => {
      const result = await createManualBookingAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Reserva creada.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRecurring(formData: FormData) {
    formData.set("courtId", courtId);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    formData.set("totalPriceARS", recurringPriceARS);
    startTransition(async () => {
      const result = await createRecurringBookingAction(tenantSlug, formData);
      if (result.ok) {
        toast.success(
          result.data.conflicts > 0
            ? `Turno fijo creado. ${result.data.conflicts} semana(s) no se pudieron tomar porque ya había algo reservado — revisalas en "Turnos fijos".`
            : "Turno fijo creado para las próximas semanas.",
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleBlock(formData: FormData) {
    formData.set("courtId", courtId);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    startTransition(async () => {
      const result = await createBlockAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Horario bloqueado.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="booking">
          <TabsList className="w-full">
            <TabsTrigger value="booking" className="flex-1">Reserva manual</TabsTrigger>
            <TabsTrigger value="recurring" className="flex-1">Turno fijo</TabsTrigger>
            <TabsTrigger value="block" className="flex-1">Bloquear</TabsTrigger>
          </TabsList>

          <TabsContent value="booking">
            <form action={handleBooking} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="playerName">Nombre del jugador</Label>
                <Input id="playerName" name="playerName" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="playerEmail">Email del jugador</Label>
                <Input id="playerEmail" name="playerEmail" type="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totalPriceARS">Precio del turno (ARS)</Label>
                <Input
                  id="totalPriceARS"
                  type="number"
                  min={0}
                  step={100}
                  required
                  value={priceARS}
                  onChange={(e) => setPriceARS(e.target.value)}
                />
                {defaultPriceCents == null && (
                  <p className="text-xs text-amber-600">No hay una regla de precio para este horario — cargalo a mano.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={(e) => setDepositPaid(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  {depositConfig.depositRequired ? (
                    <span>
                      Ya cobré la seña de <strong>{formatCentsARS(depositCents)}</strong>
                      <span className="block text-xs text-muted-foreground">
                        ({depositConfig.depositIsPercentage ? `${depositConfig.depositValue}% del turno` : "monto fijo"}) — el resto
                        lo vas a poder cargar por jugador desde la reserva.
                      </span>
                    </span>
                  ) : (
                    <span>Ya cobré el turno completo</span>
                  )}
                </label>

                {depositPaid && (
                  <div className="flex flex-col gap-1.5 pl-6">
                    <Label htmlFor="depositMethod" className="text-xs">Método de pago</Label>
                    <Select value={depositMethod} onValueChange={(v) => v && setDepositMethod(v as "CASH" | "TRANSFER")}>
                      <SelectTrigger id="depositMethod" className="h-8">
                        <SelectValue>{depositMethod === "CASH" ? "Efectivo" : "Transferencia"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Efectivo</SelectItem>
                        <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Crear reserva"}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="recurring">
            <form action={handleRecurring} className="flex flex-col gap-3">
              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Reserva ese horario todos los <strong className="capitalize">{weekdayLabel}</strong> a las{" "}
                <strong>{new Date(startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</strong> durante las
                próximas 13 semanas, sin necesidad de seña. Nadie más va a poder reservar ese horario mientras el turno fijo esté activo.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurringPlayerName">Nombre del jugador</Label>
                <Input id="recurringPlayerName" name="playerName" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurringPlayerEmail">Email del jugador</Label>
                <Input id="recurringPlayerEmail" name="playerEmail" type="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurringPriceARS">Precio del turno (ARS)</Label>
                <Input
                  id="recurringPriceARS"
                  type="number"
                  min={0}
                  step={100}
                  required
                  value={recurringPriceARS}
                  onChange={(e) => setRecurringPriceARS(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Crear turno fijo"}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="block">
            <form action={handleBlock} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Motivo</Label>
                <Input id="notes" name="notes" placeholder="Mantenimiento, torneo, clase..." required />
              </div>
              <DialogFooter>
                <Button type="submit" variant="secondary" disabled={isPending}>
                  {isPending ? "Guardando..." : "Bloquear horario"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
