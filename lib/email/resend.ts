import { Resend } from "resend";

function client() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(apiKey);
}

const from = () => process.env.EMAIL_FROM ?? "Sistema Padel <no-reply@sistema-padel.com>";

export async function sendBookingConfirmedEmail(params: {
  to: string;
  tenantName: string;
  tenantSlug: string;
  bookingId: string;
  courtName: string;
  startTime: Date;
  totalPriceCents: number;
  depositAmountCents: number;
}) {
  const { to, tenantName, tenantSlug, bookingId, courtName, startTime, totalPriceCents, depositAmountCents } = params;
  const fecha = startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });
  const total = (totalPriceCents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  const seña = (depositAmountCents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${baseUrl}/${tenantSlug}/reservas/${bookingId}`;

  await client().emails.send({
    from: from(),
    to,
    subject: `Reserva confirmada en ${tenantName}`,
    html: `
      <h2>¡Tu reserva está confirmada!</h2>
      <p><strong>${tenantName}</strong> — ${courtName}</p>
      <p>${fecha}</p>
      <p>Seña pagada: ${seña}</p>
      <p>Total del turno: ${total}</p>
      <p><a href="${bookingUrl}">Ver tu reserva o cancelarla</a></p>
    `,
  });
}

export async function sendBookingCancelledEmail(params: {
  to: string;
  tenantName: string;
  courtName: string;
  startTime: Date;
  refundAmountCents: number;
}) {
  const { to, tenantName, courtName, startTime, refundAmountCents } = params;
  const fecha = startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });
  const reembolso = (refundAmountCents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });

  await client().emails.send({
    from: from(),
    to,
    subject: `Reserva cancelada en ${tenantName}`,
    html: `
      <h2>Tu reserva fue cancelada</h2>
      <p><strong>${tenantName}</strong> — ${courtName}</p>
      <p>${fecha}</p>
      <p>Reembolso: ${refundAmountCents > 0 ? reembolso : "No corresponde reembolso según la política de cancelación."}</p>
    `,
  });
}
