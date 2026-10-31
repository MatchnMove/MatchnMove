import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { gmailConnection } from "@/lib/partner-inbox-google";
import {
  allowedInboxFile,
  cleanFileName,
  flattenParts,
  MAX_ATTACHMENT_BYTES,
  type GmailMessage,
} from "@/lib/partner-inbox-policy";
import {
  detectDocumentMimeType,
  getDocumentSha256,
  scanDocumentForMalware,
} from "@/lib/document-security";
import {
  putPrivateDocument,
  readPrivateDocument,
  deletePrivateDocument,
} from "@/lib/private-storage";
import { fail } from "@/lib/recruitment";

export async function scanAndStoreInboxAttachment(
  bytes: Buffer,
  filename: string,
) {
  if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES)
    fail("Attachments must be between 1 byte and 10 MB.");
  const name = cleanFileName(filename);
  const mime = detectDocumentMimeType(bytes);
  const contentType = allowedInboxFile(bytes, name, mime);
  if (!contentType)
    fail(
      "Use a valid PDF, PNG, JPEG, WEBP, UTF-8 TXT/CSV or modern Office document with a matching extension.",
    );
  const scan = await scanDocumentForMalware(bytes, name, contentType);
  if (scan.status !== "CLEAN")
    fail(
      "Attachment scanning must be configured and return CLEAN before files can be used.",
      503,
    );
  const key = `partner-inbox/${randomUUID()}`;
  const sha256 = getDocumentSha256(bytes);
  await putPrivateDocument({
    key,
    body: bytes,
    contentType,
    fileName: name,
    sha256,
  });
  return {
    storageKey: key,
    sha256,
    scanStatus: "CLEAN",
    fileName: name,
    mimeType: contentType,
    size: bytes.length,
  };
}

// Access must be checked by the caller before this function is called.
export async function inboxAttachmentBytes(id: string) {
  let attachment = await prisma.partnerAttachment.findUniqueOrThrow({
    where: { id },
    include: { message: { select: { gmailMessageId: true } } },
  });
  if (
    attachment.size > MAX_ATTACHMENT_BYTES ||
    attachment.scanStatus === "BLOCKED"
  )
    fail("This attachment is blocked.", 403);
  if (!attachment.storageKey || attachment.scanStatus !== "CLEAN") {
    const claim = await prisma.partnerAttachment.updateMany({
      where: {
        id,
        OR: [
          { scanStatus: { in: ["PENDING", "FAILED"] } },
          {
            scanStatus: "SCANNING",
            updatedAt: { lt: new Date(Date.now() - 180000) },
          },
        ],
      },
      data: { scanStatus: "SCANNING" },
    });
    if (!claim.count)
      fail("The attachment is being checked. Try again shortly.", 409);
    let stored:
      | Awaited<ReturnType<typeof scanAndStoreInboxAttachment>>
      | undefined;
    try {
      if (!attachment.message.gmailMessageId)
        fail("Attachment source is unavailable.", 404);
      const gmail = await gmailConnection();
      let data: string | undefined;
      if (attachment.providerAttachmentId)
        data = (
          await gmail.request<{ data: string }>(
            `/messages/${encodeURIComponent(attachment.message.gmailMessageId)}/attachments/${encodeURIComponent(attachment.providerAttachmentId)}`,
          )
        ).data;
      else {
        const message = await gmail.request<GmailMessage>(
          `/messages/${encodeURIComponent(attachment.message.gmailMessageId)}?format=full`,
        );
        data = flattenParts(message.payload).find(
          (part) => (part.partId || "root") === attachment.providerPartId,
        )?.body?.data;
      }
      if (!data || data.length > MAX_ATTACHMENT_BYTES * 1.4)
        fail("Attachment is empty or too large.");
      stored = await scanAndStoreInboxAttachment(
        Buffer.from(data, "base64url"),
        attachment.fileName,
      );
      attachment = await prisma.partnerAttachment.update({
        where: { id },
        data: stored,
        include: { message: { select: { gmailMessageId: true } } },
      });
    } catch (error) {
      if (stored)
        await deletePrivateDocument(stored.storageKey).catch(() => undefined);
      await prisma.partnerAttachment.update({
        where: { id },
        data: { scanStatus: "FAILED" },
      });
      throw error;
    }
  }
  const bytes = await readPrivateDocument(
    attachment.storageKey!,
    MAX_ATTACHMENT_BYTES,
  );
  if (attachment.sha256 !== getDocumentSha256(bytes))
    fail("Attachment integrity check failed.", 503);
  return { attachment, bytes };
}
