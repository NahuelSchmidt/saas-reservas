import { MercadoPagoConfig, Preference, Payment as MPPayment } from "mercadopago";
import crypto from "node:crypto";

/**
 * Crea una preferencia de Checkout Pro para cobrar la seña de una reserva,
 * usando el access_token propio del complejo (Mercado Pago Connect) — la
 * plata le llega directo a su cuenta, no a una cuenta central de la
 * plataforma. `externalReference` debe ser el bookingId: es lo que usamos
 * para conciliar el pago cuando llega el webhook.
 */
export async function createDepositPreference(params: {
  bookingId: string;
  tenantId: string;
  tenantSlug: string;
  courtName: string;
  startTime: Date;
  amountCents: number;
  payerEmail?: string;
  accessToken: string;
}) {
  const preference = new Preference(new MercadoPagoConfig({ accessToken: params.accessToken }));
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.bookingId,
          title: `Seña — ${params.courtName} — ${params.startTime.toLocaleString("es-AR")}`,
          quantity: 1,
          unit_price: params.amountCents / 100,
          currency_id: "ARS",
        },
      ],
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      external_reference: params.bookingId,
      notification_url: `${baseUrl}/api/webhooks/mercadopago?tenantId=${params.tenantId}`,
      back_urls: {
        success: `${baseUrl}/${params.tenantSlug}/reservas/${params.bookingId}?status=success`,
        pending: `${baseUrl}/${params.tenantSlug}/reservas/${params.bookingId}?status=pending`,
        failure: `${baseUrl}/${params.tenantSlug}/reservas/${params.bookingId}?status=failure`,
      },
      auto_return: "approved",
    },
  });

  return { preferenceId: result.id, initPoint: result.init_point };
}

/** Consulta un pago usando las credenciales del complejo dueño de esa cuenta conectada. */
export async function fetchMercadoPagoPayment(paymentId: string, accessToken: string) {
  const payment = new MPPayment(new MercadoPagoConfig({ accessToken }));
  return payment.get({ id: paymentId });
}

/**
 * Valida la firma `x-signature` del webhook de Mercado Pago siguiendo el
 * esquema documentado (HMAC-SHA256 sobre "id:{dataId};request-id:{xRequestId};ts:{ts};").
 * https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !params.xSignature) return false;

  const parts = Object.fromEntries(
    params.xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${params.dataId};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash));
}
