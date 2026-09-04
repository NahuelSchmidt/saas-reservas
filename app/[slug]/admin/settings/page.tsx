import { Clock3, Settings2, ShieldAlert, Wallet } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { getMercadoPagoAccountStatus } from "@/lib/payments/mercadopago-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingConfigForm } from "./booking-config-form";
import { CancellationPolicyForm } from "./cancellation-policy-form";
import { BusinessHoursForm } from "./business-hours-form";
import { MercadoPagoSection } from "./mercadopago-section";

function SectionTitle({ icon: Icon, color, children }: { icon: typeof Clock3; color: string; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5 text-base">
      <span className={`flex size-8 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  const [config, policy, hours, mercadoPagoAccount] = await Promise.all([
    withTenant(tenant.id, (tx) => tx.bookingConfig.findUnique({ where: { tenantId: tenant.id } })),
    withTenant(tenant.id, (tx) => tx.cancellationPolicy.findUnique({ where: { tenantId: tenant.id } })),
    withTenant(tenant.id, (tx) => tx.businessHours.findMany({ where: { tenantId: tenant.id }, orderBy: { dayOfWeek: "asc" } })),
    getMercadoPagoAccountStatus(tenant.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Horarios, reglas de reserva y política de cancelación del complejo.</p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <SectionTitle icon={Clock3} color="bg-blue-500/10 text-blue-600">Horarios de apertura</SectionTitle>
        </CardHeader>
        <CardContent>
          <BusinessHoursForm tenantSlug={tenant.slug} hours={hours} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <SectionTitle icon={Wallet} color="bg-sky-500/10 text-sky-600">Mercado Pago</SectionTitle>
        </CardHeader>
        <CardContent>
          <MercadoPagoSection
            tenantSlug={tenant.slug}
            account={mercadoPagoAccount}
            depositRequired={config?.depositRequired ?? true}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <SectionTitle icon={Settings2} color="bg-primary/10 text-primary">Reglas de reserva y seña</SectionTitle>
          </CardHeader>
          <CardContent>
            <BookingConfigForm tenantSlug={tenant.slug} config={config} />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <SectionTitle icon={ShieldAlert} color="bg-amber-500/10 text-amber-600">Política de cancelación</SectionTitle>
          </CardHeader>
          <CardContent>
            <CancellationPolicyForm tenantSlug={tenant.slug} policy={policy} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
