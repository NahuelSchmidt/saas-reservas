-- RLS para las tablas nuevas de productos/ventas (mismo criterio que
-- prisma/migrations/*_add_rls_and_constraints). "sale_items" no lleva tenantId
-- directo (se accede siempre a través de Sale, igual que booking_participants),
-- así que queda fuera de RLS y confía en el aislamiento de la capa de app.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'sales']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true))',
      t
    );
  END LOOP;
END $$;
