import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { listRecurringBookings } from "@/lib/booking/recurring-service";
import { RecurringList } from "./recurring-list";

export default async function RecurringBookingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const rules = await listRecurringBookings(tenant.id);
  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + 14);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/${slug}/admin/calendar`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al calendario
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Turnos fijos</h1>
        <p className="text-sm text-muted-foreground">
          Jugadores con un horario semanal reservado de antemano, sin necesidad de seña.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no hay turnos fijos. Creá uno desde un horario libre en el calendario.
        </p>
      ) : (
        <RecurringList tenantSlug={tenant.slug} rules={rules} soonThreshold={soonThreshold} />
      )}
    </div>
  );
}
