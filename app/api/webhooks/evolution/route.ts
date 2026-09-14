import { NextRequest, NextResponse } from "next/server";
import { applyConnectionUpdate } from "@/lib/whatsapp/evolution-connect";

/**
 * Evolution API llama acá con eventos de la instancia (creada por
 * WhatsApp Connect, ver lib/whatsapp/evolution-connect.ts). Nos interesa
 * CONNECTION_UPDATE: cuando el club escanea el QR, `data.state` pasa a
 * "open"; si se desvincula desde el celular, pasa a "close".
 *
 * `tenantId` viaja en la URL del webhook (la armamos nosotros al crear la
 * instancia) y `secret` es un chequeo simple contra spoofing — Evolution no
 * firma sus webhooks como sí lo hace Mercado Pago. El peor caso de un
 * webhook falso (sin el secret) es marcar mal un estado de conexión que de
 * todos modos se corrige solo la próxima vez que el club reconecte o
 * recargue Configuración.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  const secret = url.searchParams.get("secret");

  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET ?? "";
  if (!tenantId || !expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ received: true });
  }

  try {
    const body = (await req.json()) as {
      event?: string;
      instance?: string;
      data?: { state?: string; wuid?: string; number?: string };
    };

    const event = body.event?.toUpperCase().replace(/\./g, "_");
    if (event !== "CONNECTION_UPDATE" || !body.instance || !body.data?.state) {
      return NextResponse.json({ received: true });
    }

    const phoneNumber = body.data.number ?? body.data.wuid?.split("@")[0] ?? null;

    await applyConnectionUpdate({
      tenantId,
      instanceName: body.instance,
      state: body.data.state,
      phoneNumber,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error procesando webhook de Evolution API", err);
    return NextResponse.json({ received: true });
  }
}
