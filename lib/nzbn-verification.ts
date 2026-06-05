export const NZBN_VERIFICATION = {
  UNVERIFIED: "UNVERIFIED",
  PENDING_REVIEW: "PENDING_REVIEW",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
} as const;

export type NzbnVerificationStatus = (typeof NZBN_VERIFICATION)[keyof typeof NZBN_VERIFICATION];

export const DOCUMENT_VERIFICATION = {
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type DocumentVerificationStatus = (typeof DOCUMENT_VERIFICATION)[keyof typeof DOCUMENT_VERIFICATION];

type NzbnVerificationResult = {
  status: NzbnVerificationStatus;
  registeredName: string | null;
  entityStatus: string | null;
  source: "NZBN_API" | "CHECKSUM" | "MANUAL";
  error: string | null;
  verifiedAt: Date | null;
};

const DEFAULT_NZBN_API_BASE_URL = "https://api.business.govt.nz/gateway/nzbn/v5";

export function isValidNzbnChecksum(nzbn: string) {
  if (!/^\d{13}$/.test(nzbn)) return false;

  const digits = nzbn.split("").map(Number);
  const checkDigit = digits[12];
  const body = digits.slice(0, 12);
  let sum = 0;

  for (let index = body.length - 1, weight = 3; index >= 0; index -= 1, weight = weight === 3 ? 1 : 3) {
    sum += body[index] * weight;
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(limited|ltd|company|co|incorporated|inc|nz|new zealand)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function nameLooksLikeMatch(expectedName: string, candidates: string[]) {
  const expected = normalizeName(expectedName);
  if (!expected) return false;

  const expectedTokens = new Set(expected.split(" ").filter((token) => token.length > 2));
  if (!expectedTokens.size) return false;

  return candidates.some((candidate) => {
    const normalized = normalizeName(candidate);
    if (!normalized) return false;
    if (normalized.includes(expected) || expected.includes(normalized)) return true;

    const candidateTokens = new Set(normalized.split(" ").filter((token) => token.length > 2));
    const overlap = Array.from(expectedTokens).filter((token) => candidateTokens.has(token)).length;
    return overlap / expectedTokens.size >= 0.72;
  });
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function collectNames(payload: Record<string, unknown>) {
  const names = [
    getString(payload.entityName),
    getString(payload.name),
    getString(payload.legalName),
    getString(payload.registeredName),
  ].filter((name): name is string => Boolean(name));

  for (const key of ["tradingNames", "tradingName", "otherNames"]) {
    const value = payload[key];
    if (!Array.isArray(value)) continue;

    for (const item of value) {
      if (typeof item === "string") {
        names.push(item);
        continue;
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const itemName = getString(record.name) ?? getString(record.tradingName) ?? getString(record.entityName);
        if (itemName) names.push(itemName);
      }
    }
  }

  return Array.from(new Set(names));
}

function getEntityStatus(payload: Record<string, unknown>) {
  return (
    getString(payload.entityStatusDescription) ??
    getString(payload.entityStatus) ??
    getString(payload.status) ??
    getString(payload.entityStatusCode)
  );
}

function isActiveEntityStatus(status: string | null) {
  if (!status) return true;
  return !/(removed|inactive|deregistered|ceased|closed|struck off)/i.test(status);
}

export async function verifyNzbnAgainstRegister(nzbn: string, expectedCompanyName: string): Promise<NzbnVerificationResult> {
  const normalizedNzbn = nzbn.trim();

  if (!isValidNzbnChecksum(normalizedNzbn)) {
    return {
      status: NZBN_VERIFICATION.FAILED,
      registeredName: null,
      entityStatus: null,
      source: "CHECKSUM",
      error: "NZBN failed the official 13-digit GLN check digit validation.",
      verifiedAt: null,
    };
  }

  const subscriptionKey = process.env.NZBN_API_SUBSCRIPTION_KEY;
  if (!subscriptionKey) {
    return {
      status: NZBN_VERIFICATION.PENDING_REVIEW,
      registeredName: null,
      entityStatus: null,
      source: "CHECKSUM",
      error: "NZBN format is valid, but NZBN_API_SUBSCRIPTION_KEY is not configured for registry verification.",
      verifiedAt: null,
    };
  }

  const baseUrl = (process.env.NZBN_API_BASE_URL || DEFAULT_NZBN_API_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/entities/${encodeURIComponent(normalizedNzbn)}`, {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  }).catch(() => null);

  if (!response) {
    return {
      status: NZBN_VERIFICATION.PENDING_REVIEW,
      registeredName: null,
      entityStatus: null,
      source: "NZBN_API",
      error: "NZBN Register lookup could not be reached. Manual review is required.",
      verifiedAt: null,
    };
  }

  if (response.status === 404) {
    return {
      status: NZBN_VERIFICATION.FAILED,
      registeredName: null,
      entityStatus: null,
      source: "NZBN_API",
      error: "NZBN was not found in the NZBN Register.",
      verifiedAt: null,
    };
  }

  if (!response.ok) {
    return {
      status: NZBN_VERIFICATION.PENDING_REVIEW,
      registeredName: null,
      entityStatus: null,
      source: "NZBN_API",
      error: `NZBN Register lookup returned HTTP ${response.status}. Manual review is required.`,
      verifiedAt: null,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return {
      status: NZBN_VERIFICATION.PENDING_REVIEW,
      registeredName: null,
      entityStatus: null,
      source: "NZBN_API",
      error: "NZBN Register lookup returned an unreadable response. Manual review is required.",
      verifiedAt: null,
    };
  }

  const names = collectNames(payload);
  const entityStatus = getEntityStatus(payload);
  const registeredName = names[0] ?? null;

  if (!isActiveEntityStatus(entityStatus)) {
    return {
      status: NZBN_VERIFICATION.FAILED,
      registeredName,
      entityStatus,
      source: "NZBN_API",
      error: "NZBN exists but the entity is not active.",
      verifiedAt: null,
    };
  }

  if (!nameLooksLikeMatch(expectedCompanyName, names)) {
    return {
      status: NZBN_VERIFICATION.PENDING_REVIEW,
      registeredName,
      entityStatus,
      source: "NZBN_API",
      error: "NZBN exists, but the registered/trading name did not clearly match the mover profile name.",
      verifiedAt: null,
    };
  }

  return {
    status: NZBN_VERIFICATION.VERIFIED,
    registeredName,
    entityStatus,
    source: "NZBN_API",
    error: null,
    verifiedAt: new Date(),
  };
}
