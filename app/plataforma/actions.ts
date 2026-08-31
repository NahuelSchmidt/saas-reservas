"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { tenantOnboardingSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

/** Crea un complejo nuevo con configuración por defecto y su usuario Admin (invitado por email). */
export async function createTenantAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  await requireSuperAdmin();

  const parsed = tenantOnboardingSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    adminEmail: formData.get("adminEmail"),
    adminName: formData.get("adminName"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const existing = await prisma.tenant.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { ok: false, error: "Ese slug ya está en uso." };

  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: { name: parsed.data.name, slug: parsed.data.slug, status: "TRIAL" },
    });

    const admin = await tx.user.upsert({
      where: { email: parsed.data.adminEmail },
      update: {},
      create: { email: parsed.data.adminEmail, name: parsed.data.adminName },
    });

    await tx.tenantMembership.create({ data: { tenantId: t.id, userId: admin.id, role: "ADMIN" } });

    await tx.bookingConfig.create({
      data: { tenantId: t.id, slotDurationMinutes: 90, minAdvanceMinutes: 60, maxAdvanceDays: 14, depositRequired: true, depositIsPercentage: true, depositValue: 25 },
    });
    await tx.cancellationPolicy.create({
      data: { tenantId: t.id, hoursBeforeFullRefund: 24, hoursBeforePartialRefund: 6, partialRefundPct: 50 },
    });
    await tx.businessHours.createMany({
      data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ tenantId: t.id, dayOfWeek, openTime: "08:00", closeTime: "23:00" })),
    });

    return t;
  });

  revalidatePath("/plataforma");
  return { ok: true, data: { slug: tenant.slug } };
}

export async function suspendTenantAction(tenantId: string, suspend: boolean): Promise<ActionResult<{ ok: true }>> {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: suspend ? "SUSPENDED" : "ACTIVE" } });
  revalidatePath("/plataforma");
  return { ok: true, data: { ok: true } };
}
