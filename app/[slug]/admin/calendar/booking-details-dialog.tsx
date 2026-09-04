"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { cancelBookingAdminAction, toggleCheckInAction, registerCashPaymentAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { sumPaidCents, balanceDueCents } from "@/lib/booking/balance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Payment = { amountCents: number; status: string; type: string; method: string; note: string | null; createdAt: Date };
type Booking = {
  id: string;
  status: string;
  isBlock: boolean;
  checkedIn: boolean;
  depositStatus: string;
  totalPriceCents: number;
  cashQuarterPriceCents: number | null;
  depositAmountCents: number;
  notes: string | null;
  recurringBookingId: string | null;
  bookedBy: { name: string; email: string };
  payments: Payment[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No-show",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  MERCADOPAGO: "Online",
};

export function BookingDetailsDialog({
  tenantSlug,
  booking,
  open,
  onOpenChange,
}: {
  tenantSlug: string;
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const paidCents = sumPaidCents(booking.payments);
  const balanceCents = balanceDueCents(booking.totalPriceCents, booking.payments);

  // El turno se juega entre 4 y cada jugador paga su cuarta parte por
  // separado, algunas veces por transferencia y otras en efectivo (que puede
  // tener un precio distinto). El monto sugerido es el de UN cuarto, no el
  // saldo completo — hay que ir registrando cada pago a medida que cada
  // jugador se acerca a pagar el suyo.
  const quarterCents = Math.round(booking.totalPriceCents / 4);
  const cashQuarterCents = booking.cashQuarterPriceCents ?? quarterCents;
  function suggestedAmountCents(method: "CASH" | "TRANSFER") {
    return Math.min(balanceCents, method === "CASH" ? cashQuarterCents : quarterCents);
  }

  const [cashAmount, setCashAmount] = useState(String(suggestedAmountCents("CASH") / 100));
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  // Al cambiar de método se repropone el monto sugerido para ese método (el
  // admin puede seguir editándolo a mano después).
  function handleMethodChange(method: "CASH" | "TRANSFER") {
    setPaymentMethod(method);
    setCashAmount(String(suggestedAmountCents(method) / 100));
  }

  const registeredPayments = booking.payments.filter((p) => p.status === "APPROVED" && p.type !== "REFUND");

  function cancel() {
    if (!confirm("¿Cancelar esta reserva?")) return;
    startTransition(async () => {
      const result = await cancelBookingAdminAction(tenantSlug, booking.id);
      if (result.ok) {
        toast.success("Reserva cancelada.");
        onOpenChange(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function checkIn() {
    startTransition(async () => {
      const result = await toggleCheckInAction(tenantSlug, booking.id, !booking.checkedIn);
      if (result.ok) {
        toast.success(booking.checkedIn ? "Check-in deshecho." : "Check-in registrado.");
        onOpenChange(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function registerCash() {
    startTransition(async () => {
      const result = await registerCashPaymentAction(tenantSlug, booking.id, Number(cashAmount), paymentMethod, note || undefined);
      if (result.ok) {
        toast.success("Cobro registrado.");
        onOpenChange(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  if (booking.isBlock) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horario bloqueado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{booking.notes}</p>
          <DialogFooter>
            <Button variant="destructive" onClick={cancel} disabled={isPending}>
              Desbloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{booking.bookedBy.name}</DialogTitle>
        </DialogHeader>
        {booking.recurringBookingId && (
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            🔁 Este turno es parte de un turno fijo. Cancelarlo acá solo cancela esta semana — para cancelar todas las semanas andá a{" "}
            <strong>Turnos fijos</strong>.
          </p>
        )}
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{booking.bookedBy.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge>{STATUS_LABEL[booking.status]}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total del turno</span><span className="font-medium">{formatCentsARS(booking.totalPriceCents)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span>{formatCentsARS(paidCents)}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo pendiente</span>
            {balanceCents > 0 ? (
              <span className="font-semibold text-orange-600">{formatCentsARS(balanceCents)}</span>
            ) : (
              <span className="font-semibold text-emerald-600">Pagado por completo</span>
            )}
          </div>
        </div>

        {registeredPayments.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Receipt className="size-3.5" /> Pagos registrados
            </span>
            {registeredPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(p.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {METHOD_LABEL[p.method] ?? p.method}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-medium">{formatCentsARS(p.amountCents)}</span>
              </div>
            ))}
          </div>
        )}

        {balanceCents > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-orange-500/5 p-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Monto a cobrar (ARS)</label>
                <Input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} type="number" min={0} />
              </div>
              <div className="flex w-36 flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Método</label>
                <Select value={paymentMethod} onValueChange={(v) => v && handleMethodChange(v as "CASH" | "TRANSFER")}>
                  <SelectTrigger className="h-9">
                    <SelectValue>{paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={registerCash} disabled={isPending}>Cobrar</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              1/4 del turno: {formatCentsARS(quarterCents)} por transferencia
              {cashQuarterCents !== quarterCents ? ` · ${formatCentsARS(cashQuarterCents)} en efectivo` : ""}.
            </p>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota opcional (ej: Jugador 2 - Fede)"
              className="text-xs"
            />
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={checkIn} disabled={isPending}>
            {booking.checkedIn ? "Deshacer check-in" : "Check-in"}
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            Cancelar reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
