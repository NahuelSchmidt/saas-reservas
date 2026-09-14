"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, QrCode } from "lucide-react";
import { connectWhatsAppAction, disconnectWhatsAppAction, getWhatsAppStatusAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Instance = { status: string; phoneNumber: string | null; connectedAt: Date | null } | null;

function qrSrc(qr: string): string {
  return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
}

export function WhatsAppSection({ tenantSlug, instance }: { tenantSlug: string; instance: Instance }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qr, setQr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const result = await getWhatsAppStatusAction(tenantSlug);
      if (result.ok && result.data.status === "CONNECTED") {
        stopPolling();
        setQr(null);
        toast.success("WhatsApp conectado.");
        router.refresh();
      }
    }, 3000);
  }

  function handleConnect() {
    startTransition(async () => {
      const result = await connectWhatsAppAction(tenantSlug);
      if (result.ok) {
        setQr(result.data.qr);
        if (result.data.qr) startPolling();
        else toast.error("No se recibió el código QR — reintentá en unos segundos.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDisconnect() {
    stopPolling();
    setQr(null);
    startTransition(async () => {
      const result = await disconnectWhatsAppAction(tenantSlug);
      if (result.ok) {
        toast.success("WhatsApp desvinculado.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const connected = instance?.status === "CONNECTED";

  return (
    <div className="flex flex-col gap-4">
      {connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              <CheckCircle2 className="size-3.5" /> Conectado
            </Badge>
            <span className="text-muted-foreground">
              {instance?.phoneNumber ?? "Número vinculado"}
              {instance?.connectedAt && ` · desde ${new Date(instance.connectedAt).toLocaleDateString("es-AR")}`}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleDisconnect}>
            {isPending ? "Desvinculando..." : "Desvincular"}
          </Button>
        </div>
      ) : qr ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Escaneá este código desde WhatsApp en el celular del club: Configuración → Dispositivos vinculados → Vincular un dispositivo.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc(qr)} alt="Código QR de WhatsApp" className="size-56 rounded-lg border" />
          <p className="text-xs text-muted-foreground">El código vence en poco tiempo — si se corta, tocá &quot;Conectar WhatsApp&quot; de nuevo.</p>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleConnect}>
            Generar otro código
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Vinculá el WhatsApp del club para que las confirmaciones y cancelaciones de reservas salgan desde su
            propio número, no desde uno genérico.
          </p>
          <Button type="button" className="w-fit gap-2" disabled={isPending} onClick={handleConnect}>
            <QrCode className="size-4" />
            {isPending ? "Generando código..." : "Conectar WhatsApp"}
          </Button>
        </div>
      )}
    </div>
  );
}
