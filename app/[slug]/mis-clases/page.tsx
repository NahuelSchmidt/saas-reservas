import { redirect } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { listClassSessions } from "@/lib/classes/service";
import { MySessionCard } from "./my-session-card";

export default async function MyClassesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  let actor;
  try {
    actor = await requireTenantRole(tenant.id, ["ADMIN", "INSTRUCTOR"]);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect(`/login?callbackUrl=/${slug}/mis-clases`);
    if (err instanceof ForbiddenError) redirect(`/${slug}`);
    throw err;
  }

  const instructor = await prisma.instructor.findFirst({ where: { tenantId: tenant.id, userId: actor.id } });

  if (!instructor) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">Mis clases</h1>
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Tu cuenta todavía no está vinculada a ningún instructor en {tenant.name}. Pedile al admin del complejo que te
          asocie desde Clases → Instructores.
        </p>
      </div>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sessions = await listClassSessions(tenant.id, { from: startOfToday }, instructor.id);
  const upcomingSessions = sessions.filter((s) => s.status === "SCHEDULED");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis clases</h1>
        <p className="text-sm text-muted-foreground">{instructor.name} · {tenant.name}</p>
      </div>

      {upcomingSessions.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No tenés sesiones programadas de hoy en adelante.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingSessions.map((s) => (
            <MySessionCard key={s.id} tenantSlug={tenant.slug} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
