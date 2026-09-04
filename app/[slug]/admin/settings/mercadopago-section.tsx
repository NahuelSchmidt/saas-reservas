"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { connectMercadoPagoAction, disconnectMercadoPagoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Account = { mpUserId: string; connectedAt: Date } | null;

export function MercadoPagoSection({
  tenantSlug,
  account,
  depositRequired,
}: {
  tenantSlug: string;
  account: Account;
  depositRequired: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectMercadoPagoAction(tenantSlug);
      if (result.ok) {
        toast.success("Cuenta de Mercado Pago desconectada.");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {account ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              <CheckCircle2 className="size-3.5" /> Conectado
            </Badge>
            <span className="text-muted-foreground">
              Cuenta {account.mpUserId} · desde {new Date(account.connectedAt).toLocaleDateString("es-AR")}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleDisconnect}>
            {isPending ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Conectá la cuenta de Mercado Pago del complejo para que las señas de las reservas online lleguen
            directo a tu cuenta.
          </p>
          {depositRequired && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Tenés la seña obligatoria activada pero todavía no conectaste Mercado Pago: nadie va a poder
              reservar online hasta que la conectes.
            </div>
          )}
          <form action={connectMercadoPagoAction.bind(null, tenantSlug)}>
            <Button type="submit" className="w-fit">
              Conectar con Mercado Pago
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
