import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

/**
 * Resuelve un tenant a partir de su slug (segmento [slug] de la URL pública
 * `/(tenant)/[slug]/...`). Nunca confiar en el tenantId que venga del
 * cliente: siempre se deriva de este resolver server-side.
 */
export const resolveTenantBySlug = cache(async (slug: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  return tenant;
});

const RESERVED_FIRST_SEGMENTS = new Set(["login", "register", "plataforma", "api"]);

/**
 * Intenta identificar de qué complejo es un `callbackUrl` (p. ej.
 * `/club-demo` o `/club-demo/reservas/xyz`) para poder mostrar su nombre en
 * /login y /register. Nunca lanza notFound: si no matchea un tenant real
 * (o el callback apunta a una ruta reservada como /plataforma), devuelve null.
 */
export async function findTenantForCallback(callbackUrl: string) {
  const path = callbackUrl.split("?")[0]?.split("#")[0] ?? "";
  const slug = path.split("/").filter(Boolean)[0];
  if (!slug || RESERVED_FIRST_SEGMENTS.has(slug)) return null;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status === "SUSPENDED") return null;
  return tenant;
}
