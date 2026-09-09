import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/db/tenant-context";
import { guestEmailFromPhone } from "@/lib/booking/guest";
import { ClassSessionFullError, CourtNotAvailableError, AlreadyEnrolledError } from "./errors";

export { ClassSessionFullError, CourtNotAvailableError, AlreadyEnrolledError };

// ---------------------------------------------------------------------------
// Instructores
// ---------------------------------------------------------------------------

export async function listInstructors(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.instructor.findMany({ orderBy: { name: "asc" } }));
}

export async function createInstructor(
  tenantId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    bio?: string;
    commissionPct?: number;
    userId?: string;
    active?: boolean;
  },
) {
  return withTenant(tenantId, (tx) =>
    tx.instructor.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        bio: input.bio,
        commissionPct: input.commissionPct,
        userId: input.userId || null,
        active: input.active ?? true,
      },
    }),
  );
}

export async function updateInstructor(
  tenantId: string,
  instructorId: string,
  input: Partial<{
    name: string;
    phone?: string;
    email?: string;
    bio?: string;
    commissionPct?: number;
    userId?: string;
    active: boolean;
  }>,
) {
  return withTenant(tenantId, (tx) =>
    tx.instructor.update({
      where: { id: instructorId },
      data: { ...input, userId: input.userId === "" ? null : input.userId },
    }),
  );
}

// ---------------------------------------------------------------------------
// Tipos de clase (catálogo)
// ---------------------------------------------------------------------------

export async function listClassTypes(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.classType.findMany({ orderBy: { name: "asc" } }));
}

export async function createClassType(
  tenantId: string,
  input: {
    name: string;
    level: string;
    modality: string;
    defaultDurationMinutes: number;
    defaultCapacity: number;
    defaultPriceCents: number;
    active?: boolean;
  },
) {
  return withTenant(tenantId, (tx) =>
    tx.classType.create({
      data: {
        tenantId,
        name: input.name,
        level: input.level as Prisma.ClassTypeCreateInput["level"],
        modality: input.modality as Prisma.ClassTypeCreateInput["modality"],
        defaultDurationMinutes: input.defaultDurationMinutes,
        defaultCapacity: input.defaultCapacity,
        defaultPriceCents: input.defaultPriceCents,
        active: input.active ?? true,
      },
    }),
  );
}

export async function updateClassType(
  tenantId: string,
  classTypeId: string,
  input: Partial<{
    name: string;
    level: string;
    modality: string;
    defaultDurationMinutes: number;
    defaultCapacity: number;
    defaultPriceCents: number;
    active: boolean;
  }>,
) {
  return withTenant(tenantId, (tx) =>
    tx.classType.update({
      where: { id: classTypeId },
      data: input as Prisma.ClassTypeUpdateInput,
    }),
  );
}

// ---------------------------------------------------------------------------
// Sesiones de clase
// ---------------------------------------------------------------------------

/**
 * Chequea que la cancha (si se asignó una) esté libre en ese horario, tanto
 * contra reservas normales como contra otras clases. A diferencia de
 * bookings, esto NO tiene un exclusion constraint a nivel de Postgres — es
 * solo un chequeo de la capa de app. Si en el futuro se ve contención real
 * (dos clases pisándose por una carrera), portar la misma defensa que usa
 * `bookings` (ver prisma/migrations/*_add_rls_and_constraints).
 */
async function assertCourtFree(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; courtId: string; startTime: Date; endTime: Date; excludeSessionId?: string },
) {
  const { tenantId, courtId, startTime, endTime, excludeSessionId } = params;

  const [overlappingBooking, overlappingSession] = await Promise.all([
    tx.booking.findFirst({
      where: {
        tenantId,
        courtId,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    }),
    tx.classSession.findFirst({
      where: {
        tenantId,
        courtId,
        status: "SCHEDULED",
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    }),
  ]);

  if (overlappingBooking || overlappingSession) throw new CourtNotAvailableError();
}

export async function listClassSessions(
  tenantId: string,
  range?: { from: Date; to?: Date },
  instructorId?: string,
) {
  return withTenant(tenantId, (tx) =>
    tx.classSession.findMany({
      where: {
        ...(range ? { startTime: { gte: range.from, lt: range.to } } : undefined),
        ...(instructorId ? { instructorId } : undefined),
      },
      include: {
        classType: true,
        instructor: true,
        court: true,
        enrollments: { where: { status: { not: "CANCELLED" } } },
      },
      orderBy: { startTime: "asc" },
    }),
  );
}

export async function createClassSession(
  tenantId: string,
  input: {
    classTypeId: string;
    instructorId: string;
    courtId?: string;
    startTime: Date;
    endTime: Date;
    capacity: number;
    priceCents: number;
    notes?: string;
  },
  createdByUserId?: string,
) {
  return withTenant(tenantId, async (tx) => {
    if (input.courtId) {
      await assertCourtFree(tx, {
        tenantId,
        courtId: input.courtId,
        startTime: input.startTime,
        endTime: input.endTime,
      });
    }

    return tx.classSession.create({
      data: {
        tenantId,
        classTypeId: input.classTypeId,
        instructorId: input.instructorId,
        courtId: input.courtId || null,
        startTime: input.startTime,
        endTime: input.endTime,
        capacity: input.capacity,
        priceCents: input.priceCents,
        notes: input.notes,
        createdByUserId: createdByUserId || null,
      },
    });
  });
}

export async function cancelClassSession(tenantId: string, classSessionId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx.classEnrollment.updateMany({
      where: { classSessionId, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    });
    return tx.classSession.update({ where: { id: classSessionId }, data: { status: "CANCELLED" } });
  });
}

/** Próximas clases con cupo, para la página pública de inscripción. */
export async function getUpcomingSessionsPublic(tenantId: string) {
  const sessions = await withTenant(tenantId, (tx) =>
    tx.classSession.findMany({
      where: { status: "SCHEDULED", startTime: { gte: new Date() } },
      include: {
        classType: true,
        instructor: true,
        court: true,
        enrollments: { where: { status: { not: "CANCELLED" } } },
      },
      orderBy: { startTime: "asc" },
    }),
  );

  return sessions.map((s) => ({
    id: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    priceCents: s.priceCents,
    className: s.classType.name,
    level: s.classType.level,
    modality: s.classType.modality,
    instructorName: s.instructor.name,
    courtName: s.court?.name ?? null,
    capacity: s.capacity,
    spotsLeft: Math.max(0, s.capacity - s.enrollments.length),
  }));
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

/**
 * Inscribe a un alumno a una clase suelta (se cobra por sesión, sin cuenta
 * previa necesaria — mismo criterio que una reserva de invitado). El pago se
 * registra aparte con `registerClassPayment` (hoy manual: efectivo/transferencia
 * en el club; agregar Mercado Pago acá sería el mismo patrón que
 * lib/booking/service.ts#createBooking si en el futuro hace falta cobrar online).
 */
export async function enrollStudent(
  tenantId: string,
  input: { classSessionId: string; studentName: string; studentPhone: string },
) {
  const guestEmail = guestEmailFromPhone(input.studentPhone);

  return withTenant(tenantId, async (tx) => {
    const session = await tx.classSession.findUnique({
      where: { id: input.classSessionId },
      include: { enrollments: { where: { status: { not: "CANCELLED" } } } },
    });
    if (!session || session.status !== "SCHEDULED") throw new Error("Clase no disponible");
    if (session.enrollments.length >= session.capacity) throw new ClassSessionFullError();

    const student = await tx.user.upsert({
      where: { email: guestEmail },
      update: { name: input.studentName, phone: input.studentPhone },
      create: { email: guestEmail, name: input.studentName, phone: input.studentPhone },
    });

    const existing = await tx.classEnrollment.findUnique({
      where: { classSessionId_studentUserId: { classSessionId: input.classSessionId, studentUserId: student.id } },
    });
    if (existing && existing.status !== "CANCELLED") throw new AlreadyEnrolledError();

    const data = {
      tenantId,
      classSessionId: input.classSessionId,
      studentUserId: student.id,
      studentName: input.studentName,
      studentPhone: input.studentPhone,
      priceCents: session.priceCents,
      status: "PENDING_PAYMENT" as const,
      paymentStatus: "PENDING" as const,
    };

    if (existing) {
      return tx.classEnrollment.update({ where: { id: existing.id }, data });
    }
    return tx.classEnrollment.create({ data });
  });
}

export async function cancelEnrollment(tenantId: string, enrollmentId: string) {
  return withTenant(tenantId, (tx) =>
    tx.classEnrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } }),
  );
}

export async function registerClassPayment(
  tenantId: string,
  enrollmentId: string,
  method: "CASH" | "TRANSFER" | "MERCADOPAGO",
) {
  return withTenant(tenantId, (tx) =>
    tx.classEnrollment.update({
      where: { id: enrollmentId },
      data: { paymentMethod: method, paymentStatus: "PAID", status: "CONFIRMED" },
    }),
  );
}
