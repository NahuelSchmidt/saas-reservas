import { Clock, Users, MapPin } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { formatCentsARS } from "@/lib/availability/engine";
import { Card, CardContent } from "@/components/ui/card";
import { PricingRuleForm } from "./pricing-rule-form";
import { DeleteRuleButton } from "./delete-rule-button";

const DAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const CLIENT_TYPE_LABEL: Record<string, string> = { ANY: "Todos", MEMBER: "Socios", NON_MEMBER: "No socios" };

export default async function PricingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  const [courts, rules] = await withTenant(tenant.id, async (tx) => [
    await tx.court.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    await tx.pricingRule.findMany({ where: { tenantId: tenant.id }, orderBy: { startTime: "asc" } }),
  ]);

  const courtNameById = new Map(courts.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Precios</h1>
          <p className="text-sm text-muted-foreground">Reglas de precio por cancha, día y franja horaria.</p>
        </div>
        <PricingRuleForm tenantSlug={tenant.slug} courts={courts} />
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no configuraste precios.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="gap-4 border-border/60 py-6 shadow-sm">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="font-heading text-2xl font-bold">{formatCentsARS(rule.priceCents)}</div>
                  <DeleteRuleButton tenantSlug={tenant.slug} ruleId={rule.id} />
                </div>

                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary" />
                    {rule.startTime} – {rule.endTime} · {rule.dayOfWeek !== null ? DAY_LABEL[rule.dayOfWeek] : "Todos los días"}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    {rule.courtId ? courtNameById.get(rule.courtId) : "Todas las canchas"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="size-3.5 text-primary" />
                    {CLIENT_TYPE_LABEL[rule.clientType]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
