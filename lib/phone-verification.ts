import { createHmac, randomInt, timingSafeEqual } from "crypto";

export function normalizeNzPhoneNumber(value: string) {
  const compact = value.replace(/[^\d+]/g, "");
  if (compact.startsWith("+64")) return compact;
  if (compact.startsWith("0064")) return `+64${compact.slice(4)}`;
  if (compact.startsWith("0")) return `+64${compact.slice(1)}`;
  return compact.startsWith("+") ? compact : `+${compact}`;
}

export function createPhoneVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashPhoneVerificationCode(moverCompanyId: string, phone: string, code: string) {
  const secret = process.env.PHONE_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || "development-phone-secret";
  return createHmac("sha256", secret).update(`${moverCompanyId}:${phone}:${code}`).digest("hex");
}

export function phoneVerificationCodeMatches(expectedHash: string, actualHash: string) {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
