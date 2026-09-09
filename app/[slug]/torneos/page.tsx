import Link from "next/link";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { listTournaments } from "@/lib/tournaments/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + eliminación",
  AMERICANO: "Americano",
};

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION_OPEN: "Inscripción abierta",
  IN_PROGRESS: "En curso",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

export default async function PublicTournamentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const allTournaments = await listTournaments(tenant.id);
  const tournaments = allTournaments.filter((t) => t.status !== "DRAFT");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>

      {tournaments.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Por ahora no hay torneos para mostrar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/${tenant.slug}/torneos/${t.id}`}>
              <Card className="gap-3 border-border/60 py-5 shadow-sm transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-heading text-lg font-bold">{t.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {FORMAT_LABEL[t.format]} · Desde el {t.startDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}
                    </p>
                  </div>
                  <Badge variant={t.status === "IN_PROGRESS" ? "default" : "secondary"}>{STATUS_LABEL[t.status]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
