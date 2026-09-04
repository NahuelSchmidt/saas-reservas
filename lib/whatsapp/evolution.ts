/**
 * Envío de WhatsApp vía Evolution API (self-hosted). Mismo patrón que
 * lib/email/resend.ts: si no está configurado, el caller decide si eso es
 * un error fatal o no (acá lo tratamos como no-fatal, igual que el email).
 */
function config() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_API_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !instance || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), instance, apiKey };
}

/**
 * Normaliza a formato E.164 sin "+" para Argentina, que es lo que espera
 * Evolution API ("número" = código de país + área + línea, sin signos).
 * Los celulares de WhatsApp en Argentina llevan un "9" después del 54
 * (ej: 54 9 11 2233-4455) — si el número no lo trae, se lo agregamos.
 * Puede no cubrir todos los formatos de entrada (ej. el prefijo local "15"
 * intercalado); si ves envíos fallando por número mal armado, avisá para
 * ajustar esto con ejemplos reales.
 */
function normalizeArgentinePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `54${digits}`;
  if (!digits.startsWith("549")) digits = `549${digits.slice(2)}`;
  return digits;
}

async function sendText(phone: string, text: string) {
  const cfg = config();
  if (!cfg) return; // no configurado — no rompemos el flujo de reservas por esto

  const number = normalizeArgentinePhone(phone);
  const res = await fetch(`${cfg.baseUrl}/message/sendText/${cfg.instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.apiKey },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) throw new Error(`Evolution API respondió ${res.status}: ${await res.text()}`);
}

export async function sendBookingConfirmedWhatsApp(params: {
  phone: string;
  tenantName: string;
  tenantSlug: string;
  bookingId: string;
  courtName: string;
  startTime: Date;
  totalPriceCents: number;
  depositAmountCents: number;
}) {
  const { phone, tenantName, tenantSlug, bookingId, courtName, startTime, totalPriceCents, depositAmountCents } = params;
  const fecha = startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });
  const total = (totalPriceCents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${baseUrl}/${tenantSlug}/reservas/${bookingId}`;

  const lines = [
    `✅ *Reserva confirmada en ${tenantName}*`,
    `${courtName} — ${fecha}`,
  ];
  if (depositAmountCents > 0) {
    lines.push(`Seña pagada: ${(depositAmountCents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}`);
  }
  lines.push(`Total del turno: ${total}`, "", `Ver o cancelar tu reserva: ${bookingUrl}`);

  await sendText(phone, lines.join("\n"));
}

export async function sendBookingCancelledWhatsApp(params: {
  phone: string;
  tenantName: string;
  courtName: string;
  startTime: Date;
  refundAmountCents: number;
}) {
  const { phone, tenantName, courtName, startTime, refundAmountCents } = params;
  const fecha = startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });
  const reembolso =
    refundAmountCents > 0
      ? (refundAmountCents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
      : "No corresponde reembolso según la política de cancelación.";

  const text = [`❌ *Reserva cancelada en ${tenantName}*`, `${courtName} — ${fecha}`, `Reembolso: ${reembolso}`].join("\n");
  await sendText(phone, text);
}
