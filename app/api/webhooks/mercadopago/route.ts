import { NextRequest, NextResponse } from "next/server";
import { fetchMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";
import { getValidAccessToken } from "@/lib/payments/mercadopago-connect";
import { confirmBookingPayment } from "@/lib/booking/service";

// Mercado Pago espera 200 rápido; cualquier error nuestro se loguea pero
// igual devolvemos 200 salvo que la firma sea inválida, para evitar que MP
// reintente indefinidamente por un bug nuestro (queda en AuditLog/logs para revisar).
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");
  // Agregado por nosotros a la notification_url al crear la preferencia (ver
  // lib/payments/mercadopago.ts): identifica de qué complejo es el pago, ya
  // que cada uno tiene su propia cuenta conectada y por lo tanto sus propias
  // credenciales para consultarlo.
  const tenantId = url.searchParams.get("tenantId");

  if (!dataId || topic !== "payment" || !tenantId) {
    return NextResponse.json({ received: true });
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const validSignature = verifyMercadoPagoSignature({ xSignature, xRequestId, dataId });
  if (!validSignature) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(tenantId);
    if (!accessToken) return NextResponse.json({ received: true });

    const payment = await fetchMercadoPagoPayment(dataId, accessToken);
    const bookingId = payment.external_reference;
    if (!bookingId || payment.status !== "approved") {
      return NextResponse.json({ received: true });
    }

    await confirmBookingPayment({
      tenantId,
      bookingId,
      providerPaymentId: String(payment.id),
      amountCents: Math.round((payment.transaction_amount ?? 0) * 100),
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago", err);
    return NextResponse.json({ received: true });
  }
}
