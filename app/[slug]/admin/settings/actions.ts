"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { getAuthorizationUrl, disconnectMercadoPagoAccount } from "@/lib/payments/mercadopago-connect";
import {
  connectWhatsApp,
  refreshQrCode,
  disconnectWhatsApp,
  getWhatsAppInstanceStatus,
} from "@/lib/whatsapp/evolution-connect";
import {
  bookingConfigSchema,
  cancellationPolicySchema,
  businessHoursSchema,
  type BusinessHoursInput,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function updateBookingConfigAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = bookingConfigSchema.safeParse({
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    minAdvanceMinutes: formData.get("minAdvanceMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    depositRequired: formData.get("depositRequired") === "on",
    depositIsPercentage: formData.get("depositIsPercentage") === "true",
    depositValue: formData.get("depositValue"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  // El admin tipea "Valor de la seña" en la unidad visible (% o pesos); si es
  // monto fijo, se convierte a centavos acá, como el resto de los precios
  // del sistema (ver el comentario de depositValue en schema.prisma).
  const data = {
    ...parsed.data,
    depositValue: parsed.data.depositIsPercentage ? parsed.data.depositValue : parsed.data.depositValue * 100,
  };

  await withTenant(tenant.id, (tx) =>
    tx.bookingConfig.upsert({
      where: { tenantId: tenant.id },
      update: data,
      create: { tenantId: tenant.id, ...data },
    }),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function connectMercadoPagoAction(tenantSlug: string) {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  redirect(getAuthorizationUrl(tenant.id));
}

export async function disconnectMercadoPagoAction(tenantSlug: string): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  await disconnectMercadoPagoAccount(tenant.id);
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function connectWhatsAppAction(tenantSlug: string): Promise<ActionResult<{ qr: string | null }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  try {
    const qr = await connectWhatsApp(tenant.id, tenant.slug);
    revalidatePath(`/${tenantSlug}/admin/settings`);
    return { ok: true, data: { qr: qr?.base64 ?? null } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo iniciar la conexión con WhatsApp" };
  }
}

export async function refreshWhatsAppQrAction(tenantSlug: string): Promise<ActionResult<{ qr: string | null }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  try {
    const qr = await refreshQrCode(tenant.id);
    return { ok: true, data: { qr: qr?.base64 ?? null } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo generar el código QR" };
  }
}

export async function getWhatsAppStatusAction(
  tenantSlug: string,
): Promise<ActionResult<{ status: string; phoneNumber: string | null }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  const instance = await getWhatsAppInstanceStatus(tenant.id);
  return { ok: true, data: { status: instance?.status ?? "DISCONNECTED", phoneNumber: instance?.phoneNumber ?? null } };
}

export async function disconnectWhatsAppAction(tenantSlug: string): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);
  await disconnectWhatsApp(tenant.id);
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function updateCancellationPolicyAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = cancellationPolicySchema.safeParse({
    hoursBeforeFullRefund: formData.get("hoursBeforeFullRefund"),
    hoursBeforePartialRefund: formData.get("hoursBeforePartialRefund"),
    partialRefundPct: formData.get("partialRefundPct"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await withTenant(tenant.id, (tx) =>
    tx.cancellationPolicy.upsert({
      where: { tenantId: tenant.id },
      update: parsed.data,
      create: { tenantId: tenant.id, ...parsed.data },
    }),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

export async function updateBusinessHoursAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const updates: BusinessHoursInput[] = [];
  for (let day = 0; day <= 6; day++) {
    const parsed = businessHoursSchema.safeParse({
      dayOfWeek: day,
      openTime: formData.get(`openTime-${day}`),
      closeTime: formData.get(`closeTime-${day}`),
    });
    if (!parsed.success) return { ok: false, error: `Horario inválido para el día ${day}` };
    updates.push(parsed.data);
  }

  await withTenant(tenant.id, (tx) =>
    Promise.all(
      updates.map((u) =>
        tx.businessHours.upsert({
          where: { tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: u.dayOfWeek } },
          update: u,
          create: { tenantId: tenant.id, ...u },
        }),
      ),
    ),
  );
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}

// El navegador ya recomprime la foto antes de mandarla (ver
// profile-form.tsx), así que a esta altura debería pesar poco — este tope
// es solo una red de seguridad contra el límite real de 4.5MB que Vercel
// les pone a las Server Actions.
const MAX_COVER_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Foto de portada + dirección del complejo, mostradas en la página pública
 * de reservas. Tenant no es tenant-scoped (es la fila raíz, sin RLS), así
 * que se actualiza con el cliente de Prisma normal, no `withTenant`.
 */
export async function updateTenantProfileAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const address = String(formData.get("address") ?? "").trim();
  const photo = formData.get("photo");

  let coverPhotoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_COVER_PHOTO_BYTES) return { ok: false, error: "La imagen sigue pesando demasiado, probá con otra." };
    const blob = await put(`tenants/${tenant.id}/cover-${Date.now()}.jpg`, photo, { access: "public" });
    coverPhotoUrl = blob.url;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { address: address || null, ...(coverPhotoUrl ? { coverPhotoUrl } : {}) },
  });
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/admin/settings`);
  return { ok: true, data: { ok: true } };
}
