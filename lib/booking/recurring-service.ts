import { withTenant } from "@/lib/db/tenant-context";
import { isExclusionViolation } from "./errors";

/**
 * Cuántos días hacia adelante se materializan instancias de Booking cuando se
 * crea o extiende un turno fijo. Sin cron por ahora: el admin extiende a mano
 * desde la página de turnos fijos cuando el horizonte se va acercando.
 */
export const RECURRING_HORIZON_DAYS = 90;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toHHMM(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Materializa una instancia de Booking para una ocurrencia puntual de la
 * regla. Cada ocurrencia vive en su propia transacción (en vez de una sola
 * transacción con todo el loop) a propósito: si una ocurrencia choca con el
 * exclusion constraint, Postgres aborta esa transacción pero no afecta a las
 * demás — evita tener que manejar SAVEPOINTs para "saltear y seguir".
 */
async function materializeOccurrence(params: {
  tenantId: string;
  courtId: string;
  ruleId: string;
  bookedByUserId: string;
  createdByUserId: string;
  startTime: Date;
  endTime: Date;
  priceCents: number;
}) {
  try {
    await withTenant(params.tenantId, (tx) =>
      tx.booking.create({
        data: {
          tenantId: params.tenantId,
          courtId: params.courtId,
          bookedByUserId: params.bookedByUserId,
          createdByUserId: params.createdByUserId,
          startTime: params.startTime,
          endTime: params.endTime,
          status: "CONFIRMED",
          source: "MANUAL",
          totalPriceCents: params.priceCents,
          depositAmountCents: 0,
          depositStatus: "NOT_REQUIRED",
          notes: "Turno fijo",
          recurringBookingId: params.ruleId,
        },
      }),
    );
    return { ok: true as const };
  } catch (err) {
    if (isExclusionViolation(err)) return { ok: false as const };
    throw err;
  }
}

/**
 * Crea la regla de turno fijo y materializa una instancia de Booking por
 * semana desde `startTime` hasta el horizonte. Las ocurrencias que chocan con
 * algo ya reservado se saltean (no abortan la creación de la regla) y se
 * devuelven como `conflicts` para que el admin las revise a mano.
 */
export async function createRecurringBooking(params: {
  tenantId: string;
  courtId: string;
  startTime: Date;
  endTime: Date;
  playerName: string;
  playerEmail: string;
  priceCents: number;
  createdByUserId: string;
}) {
  const { tenantId, courtId, startTime, endTime, playerName, playerEmail, priceCents, createdByUserId } = params;
  const durationMs = endTime.getTime() - startTime.getTime();
  const horizonEnd = new Date(startTime.getTime() + RECURRING_HORIZON_DAYS * 86_400_000);

  const { rule, player } = await withTenant(tenantId, async (tx) => {
    const player = await tx.user.upsert({
      where: { email: playerEmail },
      update: {},
      create: { email: playerEmail, name: playerName },
    });
    const rule = await tx.recurringBooking.create({
      data: {
        tenantId,
        courtId,
        dayOfWeek: startTime.getDay(),
        startTime: toHHMM(startTime),
        endTime: toHHMM(endTime),
        playerName,
        playerEmail,
        priceCents,
        generatedUntil: startTime,
        createdByUserId,
      },
    });
    return { rule, player };
  });

  const conflicts: Date[] = [];
  let lastGenerated = startTime;
  for (let occurrence = new Date(startTime); occurrence < horizonEnd; occurrence = new Date(occurrence.getTime() + WEEK_MS)) {
    const result = await materializeOccurrence({
      tenantId,
      courtId,
      ruleId: rule.id,
      bookedByUserId: player.id,
      createdByUserId,
      startTime: occurrence,
      endTime: new Date(occurrence.getTime() + durationMs),
      priceCents,
    });
    if (result.ok) lastGenerated = occurrence;
    else conflicts.push(occurrence);
  }

  await withTenant(tenantId, async (tx) => {
    await tx.recurringBooking.update({ where: { id: rule.id }, data: { generatedUntil: lastGenerated } });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: createdByUserId,
        action: "recurring_booking.created",
        entityType: "RecurringBooking",
        entityId: rule.id,
        metadata: { conflicts: conflicts.length },
      },
    });
  });

  return { rule, conflicts };
}

/** Genera más instancias desde `generatedUntil` hasta un nuevo horizonte. */
export async function extendRecurringBooking(params: { tenantId: string; ruleId: string; actorUserId: string }) {
  const { tenantId, ruleId, actorUserId } = params;

  const rule = await withTenant(tenantId, (tx) => tx.recurringBooking.findUniqueOrThrow({ where: { id: ruleId } }));
  if (!rule.active) throw new Error("Este turno fijo está cancelado.");

  const [sh, sm] = rule.startTime.split(":").map(Number);
  const [eh, em] = rule.endTime.split(":").map(Number);
  const durationMs = (eh * 60 + em - (sh * 60 + sm)) * 60_000;

  const nextStart = new Date(rule.generatedUntil.getTime() + WEEK_MS);
  const horizonEnd = new Date(rule.generatedUntil.getTime() + RECURRING_HORIZON_DAYS * 86_400_000);

  const player = await withTenant(tenantId, (tx) =>
    tx.user.upsert({ where: { email: rule.playerEmail }, update: {}, create: { email: rule.playerEmail, name: rule.playerName } }),
  );

  const conflicts: Date[] = [];
  let lastGenerated = rule.generatedUntil;
  for (let occurrence = nextStart; occurrence < horizonEnd; occurrence = new Date(occurrence.getTime() + WEEK_MS)) {
    const result = await materializeOccurrence({
      tenantId,
      courtId: rule.courtId,
      ruleId: rule.id,
      bookedByUserId: player.id,
      createdByUserId: actorUserId,
      startTime: occurrence,
      endTime: new Date(occurrence.getTime() + durationMs),
      priceCents: rule.priceCents,
    });
    if (result.ok) lastGenerated = occurrence;
    else conflicts.push(occurrence);
  }

  await withTenant(tenantId, async (tx) => {
    await tx.recurringBooking.update({ where: { id: rule.id }, data: { generatedUntil: lastGenerated } });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: "recurring_booking.extended",
        entityType: "RecurringBooking",
        entityId: rule.id,
        metadata: { conflicts: conflicts.length },
      },
    });
  });

  return { conflicts };
}

/** Desactiva la regla; opcionalmente cancela las instancias futuras ya generadas para liberar esos horarios. */
export async function cancelRecurringBooking(params: {
  tenantId: string;
  ruleId: string;
  cancelFutureInstances: boolean;
  actorUserId: string;
}) {
  const { tenantId, ruleId, cancelFutureInstances, actorUserId } = params;

  await withTenant(tenantId, async (tx) => {
    await tx.recurringBooking.update({ where: { id: ruleId }, data: { active: false } });

    if (cancelFutureInstances) {
      await tx.booking.updateMany({
        where: { recurringBookingId: ruleId, startTime: { gt: new Date() }, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: "recurring_booking.cancelled",
        entityType: "RecurringBooking",
        entityId: ruleId,
        metadata: { cancelFutureInstances },
      },
    });
  });
}

export async function listRecurringBookings(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.recurringBooking.findMany({
      where: { tenantId, active: true },
      include: { court: { select: { name: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  );
}
