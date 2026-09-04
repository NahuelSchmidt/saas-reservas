import crypto from "node:crypto";
import { withTenant } from "@/lib/db/tenant-context";
import { encrypt, decrypt } from "@/lib/crypto/secret-box";

const OAUTH_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000; // refrescar si vence en menos de 1 día

function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/mercadopago/callback`;
}

function signState(tenantId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado");
  const signature = crypto.createHmac("sha256", secret).update(tenantId).digest("hex");
  return Buffer.from(`${tenantId}.${signature}`).toString("base64url");
}

/** Verifica el `state` del callback OAuth y devuelve el tenantId si es válido. */
export function verifyState(state: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [tenantId, signature] = decoded.split(".");
    if (!tenantId || !signature) return null;
    const expected = crypto.createHmac("sha256", secret).update(tenantId).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return tenantId;
  } catch {
    return null;
  }
}

export function getAuthorizationUrl(tenantId: string): string {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  if (!clientId) throw new Error("MERCADOPAGO_CLIENT_ID no configurado");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: getRedirectUri(),
    state: signState(tenantId),
  });
  return `https://auth.mercadopago.com.ar/authorization?${params.toString()}`;
}

type MpTokenResponse = {
  access_token: string;
  refresh_token: string;
  user_id: number;
  public_key?: string;
  expires_in: number;
  scope?: string;
};

async function requestToken(body: Record<string, string>) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciales de Mercado Pago no configuradas");

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error de Mercado Pago (${res.status}): ${text}`);
  }
  return (await res.json()) as MpTokenResponse;
}

export async function exchangeCodeForToken(code: string) {
  return requestToken({ grant_type: "authorization_code", code, redirect_uri: getRedirectUri() });
}

async function refreshAccessToken(refreshToken: string) {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Guarda (o reemplaza) la cuenta de Mercado Pago conectada de un tenant. */
export async function saveMercadoPagoAccount(tenantId: string, token: MpTokenResponse) {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  await withTenant(tenantId, (tx) =>
    tx.mercadoPagoAccount.upsert({
      where: { tenantId },
      update: {
        mpUserId: String(token.user_id),
        publicKey: token.public_key,
        accessToken: encrypt(token.access_token),
        refreshToken: encrypt(token.refresh_token),
        expiresAt,
        scope: token.scope,
      },
      create: {
        tenantId,
        mpUserId: String(token.user_id),
        publicKey: token.public_key,
        accessToken: encrypt(token.access_token),
        refreshToken: encrypt(token.refresh_token),
        expiresAt,
        scope: token.scope,
      },
    }),
  );
}

export async function disconnectMercadoPagoAccount(tenantId: string) {
  await withTenant(tenantId, (tx) => tx.mercadoPagoAccount.deleteMany({ where: { tenantId } }));
}

export async function getMercadoPagoAccountStatus(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.mercadoPagoAccount.findUnique({
      where: { tenantId },
      select: { mpUserId: true, connectedAt: true },
    }),
  );
}

/**
 * Devuelve un access_token vigente para el tenant, refrescándolo si está por
 * vencer. Devuelve `null` si el club todavía no conectó Mercado Pago.
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const account = await withTenant(tenantId, (tx) => tx.mercadoPagoAccount.findUnique({ where: { tenantId } }));
  if (!account) return null;

  if (account.expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return decrypt(account.accessToken);
  }

  try {
    const refreshed = await refreshAccessToken(decrypt(account.refreshToken));
    await saveMercadoPagoAccount(tenantId, refreshed);
    return refreshed.access_token;
  } catch (err) {
    console.error(`No se pudo refrescar el token de Mercado Pago del tenant ${tenantId}`, err);
    // El token viejo puede seguir siendo válido por un rato aunque el refresh haya fallado.
    return decrypt(account.accessToken);
  }
}
