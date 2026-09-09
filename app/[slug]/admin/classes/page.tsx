import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { withTenant } from "@/lib/db/tenant-context";
import { listInstructors, listClassTypes, listClassSessions } from "@/lib/classes/service";
import { formatCentsARS } from "@/lib/availability/engine";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstructorFormDialog } from "./instructor-form-dialog";
import { InstructorActiveToggle } from "./instructor-active-toggle";
import { ClassTypeFormDialog } from "./class-type-form-dialog";
import { ClassTypeActiveToggle } from "./class-type-active-toggle";
import { ClassSessionFormDialog } from "./class-session-form-dialog";
import { ClassSessionCard } from "./class-session-card";

const LEVEL_LABEL: Record<string, string> = {
  ANY: "Cualquier nivel",
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};
const MODALITY_LABEL: Record<string, string> = { GROUP: "Grupal", INDIVIDUAL: "Individual" };

export default async function ClassesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [instructors, classTypes, sessions, staffMemberships, courts] = await Promise.all([
    listInstructors(tenant.id),
    listClassTypes(tenant.id),
    listClassSessions(tenant.id, { from: startOfToday }),
    withTenant(tenant.id, (tx) => tx.tenantMembership.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } })),
    withTenant(tenant.id, (tx) => tx.court.findMany({ orderBy: { name: "asc" } })),
  ]);

  const staffUsers = staffMemberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));
  const activeInstructors = instructors.filter((i) => i.active);
  const activeClassTypes = classTypes.filter((c) => c.active);
  const upcomingSessions = sessions.filter((s) => s.status === "SCHEDULED");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clases</h1>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="instructors">Instructores</TabsTrigger>
          <TabsTrigger value="types">Tipos de clase</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <ClassSessionFormDialog tenantSlug={tenant.slug} classTypes={activeClassTypes} instructors={activeInstructors} courts={courts} />
          </div>
          {activeClassTypes.length === 0 || activeInstructors.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Para crear una sesión primero cargá al menos un instructor y un tipo de clase, ambos activos.
            </p>
          ) : upcomingSessions.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No hay sesiones programadas de hoy en adelante.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((s) => (
                <ClassSessionCard key={s.id} tenantSlug={tenant.slug} session={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instructors" className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <InstructorFormDialog tenantSlug={tenant.slug} staffUsers={staffUsers} />
          </div>
          {instructors.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Todavía no cargaste instructores.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.phone || i.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={i.userId ? "default" : "outline"}>{i.userId ? "Staff interno" : "Externo"}</Badge>
                    </TableCell>
                    <TableCell>{i.commissionPct != null ? `${i.commissionPct}%` : "—"}</TableCell>
                    <TableCell>
                      <InstructorActiveToggle tenantSlug={tenant.slug} instructorId={i.id} active={i.active} />
                    </TableCell>
                    <TableCell>
                      <InstructorFormDialog
                        tenantSlug={tenant.slug}
                        staffUsers={staffUsers}
                        instructor={{
                          id: i.id,
                          name: i.name,
                          phone: i.phone,
                          email: i.email,
                          bio: i.bio,
                          commissionPct: i.commissionPct,
                          userId: i.userId,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="types" className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <ClassTypeFormDialog tenantSlug={tenant.slug} />
          </div>
          {classTypes.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Todavía no cargaste tipos de clase.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Cupo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classTypes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{LEVEL_LABEL[c.level]}</TableCell>
                    <TableCell>{MODALITY_LABEL[c.modality]}</TableCell>
                    <TableCell>{c.defaultDurationMinutes} min</TableCell>
                    <TableCell>{c.defaultCapacity}</TableCell>
                    <TableCell>{formatCentsARS(c.defaultPriceCents)}</TableCell>
                    <TableCell>
                      <ClassTypeActiveToggle tenantSlug={tenant.slug} classTypeId={c.id} active={c.active} />
                    </TableCell>
                    <TableCell>
                      <ClassTypeFormDialog tenantSlug={tenant.slug} classType={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
