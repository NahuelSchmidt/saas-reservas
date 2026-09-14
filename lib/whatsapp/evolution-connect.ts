import { withTenant } from "@/lib/db/tenant-context";

/**
 * WhatsApp Connect: cada complejo vincula su propio número de WhatsApp
 * escaneando un QR (Evolution API, self-hosted, mismo servidor que ya usa
 * lib/whatsapp/evolution.ts). A diferencia de Mercado Pago Connect acá no hay
 * OAuth ni tokens de terceros que guardar: el servidor de Evolution es
 * nuestro, se administra con un apikey global (EVOLUTION_API_KEY) que puede
 * crear/consultar/borrar instancias de cualquier tenant — lo único que
 * persistimos por tenant es el nombre de su instancia y su estado de conexión.
 */

function config() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

function webhookUrl(tenantId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET ?? "";
  return `${baseUrl}/api/webhooks/evolution?tenantId=${tenantId}&secret=${secret}`;
}

/** Nombre de instancia derivado del slug del tenant — único, legible en el panel de Evolution. */
function instanceNameFor(tenantSlug: string): string {
  return `padel-${tenantSlug}`;
}

async function evolutionFetch(path: string, init?: RequestInit) {
  const cfg = config();
  if (!cfg) throw new Error("Evolution API no configurada (faltan EVOLUTION_API_URL/EVOLUTION_API_KEY)");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: cfg.apiKey, ...init?.headers },
  });
  if (!res.ok) throw new Error(`Evolution API respondió ${res.status}: ${await res.text()}`);
  return res.json();
}

type QrPayload = { base64?: string; code?: string } | null;

function extractQr(payload: unknown): QrPayload {
  const p = payload as Record<string, unknown>;
  const qr = (p?.qrcode ?? p) as Record<string, unknown> | undefined;
  if (!qr) return null;
  return { base64: qr.base64 as string | undefined, code: qr.code as string | undefined };
}

/**
 * Crea (o recrea) la instancia de Evolution para este tenant y devuelve el QR
 * para escanear. Si ya existe una fila en curso, primero se borra del lado de
 * Evolution para evitar quedar con una sesión fantasma.
 */
export async function connectWhatsApp(tenantId: string, tenantSlug: string): Promise<QrPayload> {
  const instanceName = instanceNameFor(tenantSlug);

  const existing = await withTenant(tenantId, (tx) => tx.whatsAppInstance.findUnique({ where: { tenantId } }));
  if (existing) {
    await deleteInstanceOnEvolution(existing.instanceName);
  }

  const created = await evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: webhookUrl(tenantId),
        byEvents: false,
        base64: false,
        events: ["CONNECTION_UPDATE"],
      },
    }),
  });

  await withTenant(tenantId, (tx) =>
    tx.whatsAppInstance.upsert({
      where: { tenantId },
      update: { instanceName, status: "PENDING", phoneNumber: null, connectedAt: null },
      create: { tenantId, instanceName, status: "PENDING" },
    }),
  );

  return extractQr(created);
}

/** Pide un QR nuevo para una instancia que ya existe pero todavía no se escaneó (el QR vence a los ~60s). */
export async function refreshQrCode(tenantId: string): Promise<QrPayload> {
  const row = await withTenant(tenantId, (tx) => tx.whatsAppInstance.findUnique({ where: { tenantId } }));
  if (!row) return null;
  const result = await evolutionFetch(`/instance/connect/${row.instanceName}`, { method: "GET" });
  return extractQr(result);
}

export async function getWhatsAppInstanceStatus(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.whatsAppInstance.findUnique({
      where: { tenantId },
      select: { status: true, phoneNumber: true, connectedAt: true },
    }),
  );
}

async function deleteInstanceOnEvolution(instanceName: string) {
  try {
    await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
  } catch {
    // puede no estar conectada — seguimos igual al delete
  }
  try {
    await evolutionFetch(`/instance/delete/${instanceName}`, { method: "DELETE" });
  } catch (err) {
    console.error(`No se pudo borrar la instancia de Evolution ${instanceName}`, err);
  }
}

export async function disconnectWhatsApp(tenantId: string) {
  const row = await withTenant(tenantId, (tx) => tx.whatsAppInstance.findUnique({ where: { tenantId } }));
  if (row) await deleteInstanceOnEvolution(row.instanceName);
  await withTenant(tenantId, (tx) => tx.whatsAppInstance.deleteMany({ where: { tenantId } }));
}

/**
 * Actualiza el estado de conexión a partir del webhook CONNECTION_UPDATE de
 * Evolution. `tenantId` viene firmado en la URL del webhook (ver
 * webhookUrl arriba); `instanceName` debe coincidir con la fila de ese mismo
 * tenant, si no coincide no se toca nada (updateMany matchea 0 filas).
 */
export async function applyConnectionUpdate(params: {
  tenantId: string;
  instanceName: string;
  state: string;
  phoneNumber?: string | null;
}) {
  const { tenantId, instanceName, state, phoneNumber } = params;
  const status = state === "open" ? "CONNECTED" : state === "close" ? "DISCONNECTED" : "PENDING";

  await withTenant(tenantId, (tx) =>
    tx.whatsAppInstance.updateMany({
      where: { tenantId, instanceName },
      data: {
        status,
        ...(status === "CONNECTED" ? { connectedAt: new Date(), phoneNumber: phoneNumber ?? undefined } : {}),
        ...(status === "DISCONNECTED" ? { phoneNumber: null } : {}),
      },
    }),
  );
}

/** Instancia activa para enviar mensajes de este tenant, o `null` si no conectó WhatsApp todavía. */
export async function getActiveInstanceName(tenantId: string): Promise<string | null> {
  const row = await withTenant(tenantId, (tx) =>
    tx.whatsAppInstance.findUnique({ where: { tenantId }, select: { instanceName: true, status: true } }),
  );
  if (!row || row.status !== "CONNECTED") return null;
  return row.instanceName;
}
