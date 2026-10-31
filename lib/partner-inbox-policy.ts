import sanitizeHtml from "sanitize-html";
import addressParser from "nodemailer/lib/addressparser";
import { z } from "zod";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const SUPPORT_MAILBOX =
  process.env.PARTNER_INBOX_ADDRESS?.trim().toLowerCase() ||
  "support@matchnmove.co.nz";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_BYTES = 15 * 1024 * 1024;
export function boundedInboxInput(value: unknown, depth = 0): boolean {
  if (depth > 10) return false;
  if (Array.isArray(value))
    return (
      value.length <= 100 &&
      value.every((item) => boundedInboxInput(item, depth + 1))
    );
  if (value && typeof value === "object") {
    const entries = Object.values(value);
    return (
      entries.length <= 100 &&
      entries.every((item) => boundedInboxInput(item, depth + 1))
    );
  }
  return true;
}
export function sanitizeEmailHtml(html: string) {
  return sanitizeHtml(html.slice(0, 2_000_000), {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "table",
      "tbody",
      "thead",
      "tr",
      "td",
      "th",
      "h1",
      "h2",
      "h3",
      "hr",
      "a",
    ],
    allowedAttributes: { a: ["href", "rel", "target"] },
    parseStyleAttributes: false,
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: "a",
        attribs: {
          href: attrs.href || "",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}
export const emailAddress = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const draftSchema = z.object({
  conversationId: z.string().optional(),
  id: z.string().optional(),
  version: z.number().int().optional(),
  mode: z.enum(["new", "reply", "replyAll", "forward"]),
  parentId: z.string().optional(),
  prospectId: z.string().optional(),
  attachmentIds: z.array(z.string()).max(10).default([]),
  to: z.array(emailAddress).min(1).max(20),
  cc: z.array(emailAddress).max(20).default([]),
  bcc: z.array(emailAddress).max(20).default([]),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (value) => !/[\r\n]/.test(value),
      "Subject cannot contain line breaks.",
    ),
  text: z.string().min(1).max(100000),
  purpose: z.enum(["REPLY", "OUTREACH", "SERVICE"]),
  serviceReason: z.string().trim().max(1000).optional(),
});
export function cleanFileName(name: string) {
  return name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180) || "attachment";
}
export function messageIds(value: string) {
  return [
    ...new Set(
      value.match(/<[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~@-]{1,500}>/g) || [],
    ),
  ].slice(-50);
}
export function allowedInboxFile(
  bytes: Buffer,
  name: string,
  detected: string | null,
) {
  const extension = name.toLowerCase().split(".").pop();
  const expected: Record<string, string[]> = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    webp: ["image/webp"],
  };
  if (extension && expected[extension])
    return detected && expected[extension].includes(detected) ? detected : null;
  if (["docx", "xlsx", "pptx"].includes(extension || "")) {
    // ZIP signatures alone do not establish that an archive is an Office file.
    if (
      !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
      !bytes.includes(Buffer.from("[Content_Types].xml"))
    )
      return null;
    const prefix =
      extension === "docx" ? "word/" : extension === "xlsx" ? "xl/" : "ppt/";
    return bytes.includes(Buffer.from(prefix)) &&
      !bytes.includes(Buffer.from("vbaProject.bin"))
      ? "application/octet-stream"
      : null;
  }
  if (["txt", "csv"].includes(extension || "") && !bytes.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return "text/plain";
    } catch {
      return null;
    }
  }
  return null;
}
function encryptionKey() {
  const value = process.env.PARTNER_INBOX_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value))
    throw new Error(
      "Configure PARTNER_INBOX_ENCRYPTION_KEY with 32 random bytes in hex.",
    );
  return Buffer.from(value, "hex");
}
export function sealInboxSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("matchnmove-partner-inbox-v1"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}
export function openInboxSecret(value: string) {
  const [iv, tag, data] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !data)
    throw new Error("Invalid encrypted inbox secret.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from("matchnmove-partner-inbox-v1"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
};
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};
export function header(part: GmailPart | undefined, name: string) {
  return (
    part?.headers?.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    )?.value || ""
  );
}
export function addresses(value: string) {
  const found = addressParser(value.slice(0, 30000), { flatten: true }).map(
    (item) => item.address,
  );
  return [
    ...new Set(
      found
        .map((email) => email.toLowerCase())
        .filter((email) => emailAddress.safeParse(email).success),
    ),
  ].slice(0, 50);
}
export function flattenParts(part: GmailPart | undefined): GmailPart[] {
  return part ? [part, ...(part.parts || []).flatMap(flattenParts)] : [];
}
function decodeText(bytes: Buffer, charset = "utf-8") {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return bytes.toString("utf8");
  }
}
export function decodeEmailHeader(value: string) {
  return value
    .replace(/(\?=)\s+(?==\?)/g, "$1")
    .replace(
      /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
      (_word, charset: string, encoding: string, encoded: string) => {
        const bytes =
          encoding.toLowerCase() === "b"
            ? Buffer.from(encoded, "base64")
            : Buffer.from(
                encoded
                  .replace(/_/g, " ")
                  .replace(/=([a-f\d]{2})/gi, (_match, hex: string) =>
                    String.fromCharCode(parseInt(hex, 16)),
                  ),
                "latin1",
              );
        return decodeText(bytes, charset);
      },
    )
    .replace(/[\r\n]+/g, " ");
}
export function extractGmailContent(message: GmailMessage) {
  const parts = flattenParts(message.payload);
  const body = (type: string) =>
    parts
      .filter(
        (part) => part.mimeType === type && !part.filename && part.body?.data,
      )
      .map((part) =>
        decodeText(
          Buffer.from(part.body!.data!, "base64url"),
          header(part, "content-type").match(
            /charset\s*=\s*["']?([^;"'\s]+)/i,
          )?.[1],
        ),
      )
      .join("\n")
      .slice(0, 2_000_000);
  const html = sanitizeEmailHtml(body("text/html"));
  const text =
    body("text/plain") ||
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return {
    text,
    html,
    attachments: parts
      .filter(
        (part) =>
          part.filename ||
          (part.body?.attachmentId &&
            !["text/plain", "text/html"].includes(part.mimeType || "")),
      )
      .map((part) => ({
        providerPartId: part.partId || "root",
        providerAttachmentId: part.body?.attachmentId || null,
        fileName: cleanFileName(part.filename || "attachment"),
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body?.size || 0,
        contentId: header(part, "content-id") || null,
      })),
  };
}
