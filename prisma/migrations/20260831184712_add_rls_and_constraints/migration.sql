-- ---------------------------------------------------------------------------
-- 1. Anti doble-reserva a nivel de base de datos
-- ---------------------------------------------------------------------------
-- Sin esto, dos requests concurrentes podrían crear reservas solapadas para
-- la misma cancha aunque la app chequee disponibilidad antes de insertar.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prisma mapea DateTime a TIMESTAMP(3) sin zona horaria (no TIMESTAMPTZ), por
-- lo que usamos tsrange (no tstzrange): tstzrange requeriría castear con la
-- zona horaria de la sesión, una función no IMMUTABLE, lo que Postgres
-- rechaza en un índice.
ALTER TABLE "bookings"
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    "courtId" WITH =,
    tsrange("startTime", "endTime") WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED'));

-- ---------------------------------------------------------------------------
-- 2. Row Level Security (defensa en profundidad, además del filtrado en la
--    capa de app vía lib/db/tenant-context.ts)
-- ---------------------------------------------------------------------------
-- current_setting('app.tenant_id', true) devuelve NULL si no fue seteado en
-- la transacción actual (segundo argumento `true` = "missing_ok"), por lo que
-- una conexión sin `set_config` explícito no ve ninguna fila.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenant_memberships', 'courts', 'business_hours', 'pricing_rules',
    'booking_configs', 'cancellation_policies', 'bookings', 'payments',
    'waitlist_entries', 'coupons', 'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Postgres exime por defecto al dueño de la tabla de sus propias políticas
    -- RLS. Como la app se conecta con el rol que creó las tablas (`postgres`,
    -- vía Supabase), FORCE es necesario para que la política aplique también
    -- a esa conexión y esta capa sea una defensa real, no solo cosmética.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true))',
      t
    );
  END LOOP;
END $$;
