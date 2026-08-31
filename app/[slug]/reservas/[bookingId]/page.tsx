import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getBookingDetail } from "@/lib/booking/service";
import { formatCentsARS } from "@/lib/availability/engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelBookingButton } from "./cancel-booking-button";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No se presentó",
};

const MP_REDIRECT_MESSAGE: Record<string, string> = {
  success: "¡Pago recibido! Tu reserva está confirmada.",
  pending: "Tu pago está siendo procesado. Te avisamos por email en cuanto se confirme.",
  failure: "El pago no se pudo procesar. Podés intentar de nuevo.",
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug, bookingId } = await params;
  const { status: mpStatus } = await searchParams;

  const tenant = await resolveTenantBySlug(slug);
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/${slug}/reservas/${bookingId}`);

  const booking = await getBookingDetail(tenant.id, bookingId);
  if (!booking) notFound();

  const isOwner = booking.bookedBy.id === session.user.id;
  const isStaff = session.user.memberships.some((m) => m.tenantId === tenant.id);
  if (!isOwner && !isStaff) notFound();

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10 sm:px-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Reserva en {tenant.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mpStatus && MP_REDIRECT_MESSAGE[mpStatus] && (
            <p className="rounded-md bg-muted p-3 text-sm">{MP_REDIRECT_MESSAGE[mpStatus]}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cancha</span>
            <span className="font-medium">{booking.court.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fecha y hora</span>
            <span className="font-medium">
              {booking.startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{formatCentsARS(booking.totalPriceCents)}</span>
          </div>
          {booking.depositAmountCents > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seña</span>
              <span className="font-medium">{formatCentsARS(booking.depositAmountCents)}</span>
            </div>
          )}

          {(booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT") && (
            <CancelBookingButton tenantSlug={tenant.slug} bookingId={booking.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
