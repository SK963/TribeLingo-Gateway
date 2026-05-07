import crypto from "crypto";
import { env } from "../../config/env";

function getKey(): Buffer | null {
  if (!env.DATA_ENCRYPTION_KEY_BASE64) return null;
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY_BASE64, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
  return key;
}

export function encryptOptional(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = getKey();
  if (!key) return plaintext; // dev-friendly fallback; set key in prod

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptOptional(ciphertextB64: string | null | undefined): string | null {
  if (!ciphertextB64) return null;
  const key = getKey();
  if (!key) return ciphertextB64;

  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

