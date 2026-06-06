import { createHash } from "crypto";

const MIME_SIGNATURES = [
  {
    mimeType: "application/pdf",
    matches: (buffer: Buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    mimeType: "image/png",
    matches: (buffer: Buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: "image/jpeg",
    matches: (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: "image/webp",
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
] as const;

export function detectDocumentMimeType(buffer: Buffer) {
  return MIME_SIGNATURES.find((signature) => signature.matches(buffer))?.mimeType ?? null;
}

export function getDocumentSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function scanDocumentForMalware(buffer: Buffer, fileName: string, mimeType: string) {
  const scanUrl = process.env.MALWARE_SCAN_URL?.trim();
  const scanToken = process.env.MALWARE_SCAN_TOKEN?.trim();

  if (!scanUrl) {
    const explicitlyAllowed = process.env.ALLOW_UNSCANNED_DOCUMENTS === "true";
    if (process.env.NODE_ENV === "production" && !explicitlyAllowed) {
      throw new Error("Document scanning is not configured. Add MALWARE_SCAN_URL before accepting production uploads.");
    }

    return { status: "NOT_CONFIGURED", provider: null };
  }

  const response = await fetch(scanUrl, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      "X-File-Name": encodeURIComponent(fileName),
      ...(scanToken ? { Authorization: `Bearer ${scanToken}` } : {}),
    },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Document scanner returned ${response.status}.`);
  }

  const result = (await response.json().catch(() => null)) as { clean?: boolean; status?: string; provider?: string } | null;
  if (!result || result.clean !== true) {
    throw new Error("The uploaded document did not pass the malware scan.");
  }

  return { status: result.status || "CLEAN", provider: result.provider || scanUrl };
}
