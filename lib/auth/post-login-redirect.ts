import { prisma } from "@/lib/db/prisma";

/**
 * Destino por defecto tras el login cuando no vinimos de un `callbackUrl`
 * explícito (p. ej. entrando directo a /login): Super Admin va a la
 * plataforma, staff de un complejo va a su panel, cualquier otro usuario
 * (jugador) va a la home.
 */
export async function getDefaultPostLoginRedirect(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      globalRole: true,
      memberships: { select: { tenant: { select: { slug: true } } }, take: 1 },
    },
  });

  if (user?.globalRole === "SUPER_ADMIN") return "/plataforma";
  if (user?.memberships[0]) return `/${user.memberships[0].tenant.slug}/admin`;
  return "/";
}
