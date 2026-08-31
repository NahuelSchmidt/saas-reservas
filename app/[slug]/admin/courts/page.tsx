import { Layers, Users, Lightbulb } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { Card, CardContent } from "@/components/ui/card";
import { CourtFormDialog } from "./court-form-dialog";
import { CourtStatusSelect } from "./court-status-select";

const TYPE_LABEL: Record<string, string> = { SINGLES: "Individual", DOUBLES: "Dobles" };
const LOCATION_LABEL: Record<string, string> = {
  INDOOR: "Indoor",
  OUTDOOR: "Outdoor",
  PANORAMIC: "Panorámica",
  COVERED: "Con techo",
};

export default async function CourtsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const courts = await withTenant(tenant.id, (tx) =>
    tx.court.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" } }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Canchas</h1>
        <CourtFormDialog tenantSlug={tenant.slug} />
      </div>

      {courts.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no cargaste canchas.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => (
            <Card key={court.id} className="gap-4 border-border/60 py-6 shadow-sm">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-heading text-lg font-bold">{court.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[court.type]} · {LOCATION_LABEL[court.location]}
                    </p>
                  </div>
                  <CourtStatusSelect tenantSlug={tenant.slug} courtId={court.id} status={court.status} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {court.surface && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      <Layers className="size-3" /> {court.surface}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    <Users className="size-3" /> {court.capacity} jugadores
                  </span>
                  {court.hasLighting && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Lightbulb className="size-3" /> Iluminación
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
