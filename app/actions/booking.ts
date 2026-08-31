"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { createBooking, cancelBooking, getDayAvailability, SlotUnavailableError } from "@/lib/booking/service";
import { createBookingSchema, cancelBookingSchema } from "@/lib/validation/schemas";
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

export async function createBookingAction(
  tenantSlug: string,
  input: unknown,
): Promise<ActionResult<{ bookingId: string; paymentUrl: string | null }>> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Necesitás iniciar sesión para reservar." };

  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos de reserva inválidos." };

  const tenant = await resolveTenantBySlug(tenantSlug);

  try {
    const { booking, paymentUrl } = await createBooking({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      bookedByUserId: session.user.id,
      playerEmail: session.user.email,
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
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Necesitás iniciar sesión." };

  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const tenant = await resolveTenantBySlug(tenantSlug);

  try {
    await cancelBooking({
      tenantId: tenant.id,
      bookingId: parsed.data.bookingId,
      actorUserId: session.user.id,
      reason: parsed.data.reason,
    });
    revalidatePath(`/${tenantSlug}`);
    return { ok: true, data: { cancelled: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No pudimos cancelar la reserva." };
  }
}
