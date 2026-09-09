import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaffInviteDialog } from "./staff-invite-dialog";
import { StaffRoleSelect } from "./staff-role-select";
import { RemoveStaffButton } from "./remove-staff-button";

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const memberships = await withTenant(tenant.id, (tx) =>
    tx.tenantMembership.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas del equipo del complejo. Los profesores con rol Instructor solo pueden administrar sus propias clases en{" "}
            <span className="font-mono text-xs">/{tenant.slug}/mis-clases</span>, no ven el resto del panel.
          </p>
        </div>
        <StaffInviteDialog tenantSlug={tenant.slug} />
      </div>

      {memberships.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no cargaste staff.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.user.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.user.email}</TableCell>
                <TableCell>
                  <StaffRoleSelect tenantSlug={tenant.slug} membershipId={m.id} role={m.role} />
                </TableCell>
                <TableCell>
                  <RemoveStaffButton tenantSlug={tenant.slug} membershipId={m.id} name={m.user.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
