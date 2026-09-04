import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Modelos que llevan tenantId. Se usan para inyectar el filtro automáticamente
 * y como lista de referencia para las políticas RLS (ver migrations/*_rls.sql).
 */
const TENANT_SCOPED_MODELS = new Set([
  "TenantMembership",
  "Court",
  "BusinessHours",
  "PricingRule",
  "BookingConfig",
  "CancellationPolicy",
  "Booking",
  "Payment",
  "WaitlistEntry",
  "Coupon",
  "AuditLog",
  "Product",
  "Sale",
  "RecurringBooking",
  "CashRegisterClose",
  "MercadoPagoAccount",
]);

const WRITE_WITH_DATA_OPS = new Set(["create", "createMany", "upsert"]);
const FILTER_BY_WHERE_OPS = new Set([
  "findFirst",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "findFirstOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
]);

/**
 * Cliente de Prisma extendido: inyecta automáticamente `tenantId` en los
 * `where` de lectura/escritura y en los `data` de creación para los modelos
 * tenant-scoped, sin depender de que cada query lo recuerde. Esta es la
 * primera capa de aislamiento; `withTenant` agrega la segunda (RLS).
 */
function scopedClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args);

          const a = args as Record<string, unknown>;

          if (WRITE_WITH_DATA_OPS.has(operation)) {
            if (operation === "createMany" && Array.isArray((a as { data?: unknown }).data)) {
              (a as { data: Record<string, unknown>[] }).data = (
                a as { data: Record<string, unknown>[] }
              ).data.map((d) => ({ ...d, tenantId }));
            } else if ((a as { data?: Record<string, unknown> }).data) {
              (a as { data: Record<string, unknown> }).data = {
                ...(a as { data: Record<string, unknown> }).data,
                tenantId,
              };
            }
            if ((a as { create?: Record<string, unknown> }).create) {
              (a as { create: Record<string, unknown> }).create = {
                ...(a as { create: Record<string, unknown> }).create,
                tenantId,
              };
            }
          }

          if (FILTER_BY_WHERE_OPS.has(operation)) {
            (a as { where?: Record<string, unknown> }).where = {
              ...(a as { where?: Record<string, unknown> }).where,
              tenantId,
            };
          }

          return query(a as typeof args);
        },
      },
    },
  });
}

/**
 * Ejecuta `callback` con un cliente de Prisma scopeado a un tenant.
 *
 * Doble capa de aislamiento:
 * 1. Extensión de Prisma (scopedClient): inyecta tenantId automáticamente.
 * 2. RLS de Postgres: `set_config('app.tenant_id', ...)` con `is_local = true`
 *    dentro de la misma transacción, de forma que las políticas RLS filtren
 *    también a nivel de base de datos aunque haya un bug en la capa de app.
 *    `is_local = true` limita el efecto a la transacción actual, algo
 *    indispensable con conexiones pooleadas (PgBouncer/Neon/Supabase).
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!tenantId) throw new Error("withTenant: tenantId requerido");

  return scopedClient(tenantId).$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return callback(tx as unknown as Prisma.TransactionClient);
    },
    // Margen por encima del default de 5s: con pooler gratuito (Supabase/Neon)
    // la latencia por round-trip puede ser alta. Aun así cada `withTenant`
    // debe evitar anidar otra transacción adentro (ver computeAvailabilityWithTx
    // en lib/booking/service.ts) y nunca hacer llamadas a APIs externas dentro.
    { timeout: 15_000 },
  );
}
