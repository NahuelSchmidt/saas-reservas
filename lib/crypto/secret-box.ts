import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Deriva la clave de 32 bytes a partir de MERCADOPAGO_TOKEN_ENCRYPTION_KEY
 * (generada con `openssl rand -base64 32`). No usamos AUTH_SECRET acá para
 * no mezclar el propósito de firma de sesión con el de encriptar credenciales
 * de terceros (rotarlas por separado no debe invalidar sesiones ni viceversa).
 */
function getKey(): Buffer {
  const raw = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("MERCADOPAGO_TOKEN_ENCRYPTION_KEY no configurado");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("MERCADOPAGO_TOKEN_ENCRYPTION_KEY debe ser de 32 bytes (base64)");
  return key;
}

/** Encripta un texto plano. Formato de salida: "iv:authTag:ciphertext", todo en base64. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Formato de dato encriptado inválido");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
