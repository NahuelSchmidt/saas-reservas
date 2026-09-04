"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";
import { cancelRecurringBookingAction, extendRecurringBookingAction } from "../actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Rule = {
  id: string;
  courtId: string;
  court: { name: string };
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  playerName: string;
  playerEmail: string;
  priceCents: number;
  generatedUntil: Date;
};

export function RecurringList({
  tenantSlug,
  rules,
  soonThreshold,
}: {
  tenantSlug: string;
  rules: Rule[];
  /** Fecha (calculada en el server) a partir de la cual mostramos el aviso de "vence pronto". */
  soonThreshold: Date;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function cancel(ruleId: string) {
    const cancelFuture = confirm(
      "¿Cancelar también las próximas reservas ya generadas de este turno fijo? Aceptar libera esos horarios para que otros puedan reservarlos. Cancelar solo desactiva el turno fijo sin tocar lo ya reservado.",
    );
    startTransition(async () => {
      const result = await cancelRecurringBookingAction(tenantSlug, ruleId, cancelFuture);
      if (result.ok) {
        toast.success("Turno fijo cancelado.");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function extend(ruleId: string) {
    startTransition(async () => {
      const result = await extendRecurringBookingAction(tenantSlug, ruleId);
      if (result.ok) {
        toast.success(
          result.data.conflicts > 0
            ? `Extendido. ${result.data.conflicts} semana(s) no se pudieron tomar porque ya había algo reservado.`
            : "Turno fijo extendido por más semanas.",
        );
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rules.map((rule) => {
        const soonToExpire = new Date(rule.generatedUntil) <= soonThreshold;

        return (
          <Card key={rule.id} className="gap-3 border-border/60 py-6 shadow-sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-heading text-lg font-bold">{rule.playerName}</span>
                  <p className="text-xs text-muted-foreground">{rule.playerEmail}</p>
                </div>
                <span className="font-heading text-lg font-bold">{formatCentsARS(rule.priceCents)}</span>
              </div>

              <div className="text-sm">
                <div>
                  {WEEKDAYS[rule.dayOfWeek]} · {rule.startTime} – {rule.endTime}
                </div>
                <div className="text-muted-foreground">{rule.court.name}</div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={soonToExpire ? "text-orange-600" : undefined}>
                  Generado hasta {new Date(rule.generatedUntil).toLocaleDateString("es-AR")}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => extend(rule.id)} disabled={isPending} className="flex-1 gap-1.5">
                  <RefreshCw className="size-3.5" /> Extender
                </Button>
                <Button variant="destructive" size="sm" onClick={() => cancel(rule.id)} disabled={isPending} className="flex-1 gap-1.5">
                  <X className="size-3.5" /> Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
