"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { createBooking, cancelBooking, getBookingDetail, getDayAvailability, SlotUnavailableError } from "@/lib/booking/service";
import { guestBookingSchema, cancelBookingSchema } from "@/lib/validation/schemas";
import { parseLocalISODate } from "@/lib/availability/date-utils";
import type { Slot } from "@/lib/availability/engine";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getAvailabilityAction(
  tenantSlug: string,
  dateISO: string,
): Promise<ActionResult<Slot[]>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  try {
    const slots = await getDayAvailability({ tenantId: tenant.id, date: parseLocalISODate(dateISO) });
    return { ok: true, data: slots };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos cargar la disponibilidad." };
  }
}

/** Convierte un teléfono en un email sintético estable, para poder reusar el modelo User (que requiere email único) sin pedirle cuenta al jugador. */
function guestEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel-${digits}@guest.sistema-padel.local`;
}

export async function createBookingAction(
  tenantSlug: string,
  input: unknown,
): Promise<ActionResult<{ bookingId: string; paymentUrl: string | null }>> {
  const parsed = guestBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos de reserva inválidos." };

  const tenant = await resolveTenantBySlug(tenantSlug);
  const guestEmail = guestEmailFromPhone(parsed.data.playerPhone);

  const player = await prisma.user.upsert({
    where: { email: guestEmail },
    update: { name: parsed.data.playerName, phone: parsed.data.playerPhone },
    create: { email: guestEmail, name: parsed.data.playerName, phone: parsed.data.playerPhone },
  });

  try {
    const { booking, paymentUrl } = await createBooking({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      bookedByUserId: player.id,
      playerEmail: guestEmail,
      playerPhone: parsed.data.playerPhone,
      notes: parsed.data.notes,
    });

    revalidatePath(`/${tenantSlug}`);
    return { ok: true, data: { bookingId: booking.id, paymentUrl } };
  } catch (err) {
    if (err instanceof SlotUnavailableError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos crear la reserva. Intentá de nuevo." };
  }
}

export async function cancelBookingAction(
  tenantSlug: string,
  input: unknown,
): Promise<ActionResult<{ cancelled: true }>> {
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const tenant = await resolveTenantBySlug(tenantSlug);

  try {
    // Sin cuenta de jugador, el link con el bookingId (impredecible) es la
    // credencial: quien lo tiene, puede cancelar. Si hay sesión (staff u
    // otro caso), esa identidad queda en la auditoría; si no, queda a
    // nombre de quien reservó.
    const session = await auth();
    const booking = await getBookingDetail(tenant.id, parsed.data.bookingId);
    if (!booking) return { ok: false, error: "Reserva no encontrada." };

    await cancelBooking({
      tenantId: tenant.id,
      bookingId: parsed.data.bookingId,
      actorUserId: session?.user?.id ?? booking.bookedBy.id,
      reason: parsed.data.reason,
    });
    revalidatePath(`/${tenantSlug}`);
    return { ok: true, data: { cancelled: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos cancelar la reserva." };
  }
}
