import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTenantDialog } from "./create-tenant-dialog";
import { SuspendTenantButton } from "./suspend-tenant-button";

export default async function PlataformaPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true, courts: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Complejos</h1>
        <CreateTenantDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Canchas</TableHead>
            <TableHead>Reservas</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">
                <Link href={`/${t.slug}`} className="hover:underline">{t.name}</Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{t.slug}</TableCell>
              <TableCell>
                <Badge variant={t.status === "ACTIVE" ? "default" : t.status === "SUSPENDED" ? "destructive" : "secondary"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>{t._count.courts}</TableCell>
              <TableCell>{t._count.bookings}</TableCell>
              <TableCell>
                <SuspendTenantButton tenantId={t.id} suspended={t.status === "SUSPENDED"} />
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Todavía no hay complejos creados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
