import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const scrypt = promisify(scryptCallback);
const SCRYPT_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;

function isScryptHash(value: string) {
  return value.startsWith(`${SCRYPT_PREFIX}$`);
}

export function needsPasswordRehash(passwordHash: string) {
  return !isScryptHash(passwordHash);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

  return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyScryptPassword(password: string, passwordHash: string) {
  const [, salt, storedKeyHex] = passwordHash.split("$");
  if (!salt || !storedKeyHex) return false;

  const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(storedKeyHex, "hex");

  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (isScryptHash(passwordHash)) {
    return verifyScryptPassword(password, passwordHash);
  }

  return bcrypt.compare(password, passwordHash);
}
