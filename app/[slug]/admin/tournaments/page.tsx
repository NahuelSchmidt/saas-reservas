import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { listTournaments } from "@/lib/tournaments/service";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TournamentFormDialog } from "./tournament-form-dialog";
import { TournamentStatusSelect } from "./tournament-status-select";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + eliminación",
  AMERICANO: "Americano",
};

export default async function TournamentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const tournaments = await listTournaments(tenant.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenant.slug}/torneos`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="size-3.5" /> Ver página pública
          </Link>
          <TournamentFormDialog tenantSlug={tenant.slug} />
        </div>
      </div>

      {tournaments.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no creaste ningún torneo.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Categorías</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournaments.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link href={`/${tenant.slug}/admin/tournaments/${t.id}`} className="hover:underline">{t.name}</Link>
                </TableCell>
                <TableCell>{FORMAT_LABEL[t.format]}</TableCell>
                <TableCell>{t.startDate.toLocaleDateString("es-AR", { timeZone: "UTC" })}</TableCell>
                <TableCell>
                  {t.categories.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {t.categories.map((c) => (
                        <Badge key={c.id} variant="outline">
                          {c.name} ({c._count.teams + c._count.participants})
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <TournamentStatusSelect tenantSlug={tenant.slug} tournamentId={t.id} status={t.status} />
                </TableCell>
                <TableCell>
                  <Link href={`/${tenant.slug}/admin/tournaments/${t.id}`} className="text-sm text-primary hover:underline">
                    Administrar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
