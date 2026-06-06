import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { generateSecret, generateURI, verify } from "otplib";

function getEncryptionKey() {
  const configured = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = /^[a-f0-9]{64}$/i.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
    throw new Error("MFA_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex value.");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MFA_ENCRYPTION_KEY is required in production.");
  }

  return createHash("sha256")
    .update(process.env.NEXTAUTH_SECRET || "development-mfa-key")
    .digest();
}

export function createAdminMfaSecret() {
  return generateSecret();
}

export function encryptAdminMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptAdminMfaSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored MFA secret is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function getAdminMfaKeyUri(email: string, secret: string) {
  return generateURI({ issuer: "Match n Move Admin", label: email, secret });
}

export async function verifyAdminMfaCode(secret: string, code: string) {
  const result = await verify({ secret, token: code, epochTolerance: 30 });
  return result.valid;
}
