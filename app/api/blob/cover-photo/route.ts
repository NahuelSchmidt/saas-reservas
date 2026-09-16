import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db/prisma";
import { requireTenantRole, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";

/**
 * Emite el token para que el navegador suba la foto de portada del club
 * directo a Vercel Blob (evita el límite de 4.5MB de las Server Actions en
 * Vercel). El chequeo de que quien pide el token sea ADMIN del tenant pasa
 * acá — es la única barrera antes de que Blob acepte el archivo.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        const clientPayload = clientPayloadRaw ? (JSON.parse(clientPayloadRaw) as { tenantSlug?: string }) : null;
        const tenantSlug = clientPayload?.tenantSlug;
        if (!tenantSlug) throw new Error("Falta el tenant.");

        const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (!tenant) throw new Error("Complejo no encontrado.");
        await requireTenantRole(tenant.id, ["ADMIN"]);

        if (!pathname.startsWith(`tenants/${tenant.id}/`)) {
          throw new Error("Ruta de archivo inválida.");
        }

        return {
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    const message = err instanceof Error ? err.message : "Error al procesar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
