import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyState, exchangeCodeForToken, saveMercadoPagoAccount } from "@/lib/payments/mercadopago-connect";

function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl);
}

/**
 * Mercado Pago redirige acá el browser del admin del club después de que
 * autoriza la conexión (Mercado Pago Connect). El `state` viene firmado por
 * nosotros (ver getAuthorizationUrl) así que confiamos en el tenantId que
 * trae sin necesitar sesión activa en esta request.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const tenantId = state ? verifyState(state) : null;
  if (!code || !tenantId) {
    return NextResponse.redirect(appUrl("/?mp_error=invalid_state"));
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) {
    return NextResponse.redirect(appUrl("/?mp_error=invalid_state"));
  }

  try {
    const token = await exchangeCodeForToken(code);
    await saveMercadoPagoAccount(tenantId, token);
    return NextResponse.redirect(appUrl(`/${tenant.slug}/admin/settings?mp=connected`));
  } catch (err) {
    console.error("Error conectando Mercado Pago", err);
    return NextResponse.redirect(appUrl(`/${tenant.slug}/admin/settings?mp_error=exchange_failed`));
  }
}
