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
