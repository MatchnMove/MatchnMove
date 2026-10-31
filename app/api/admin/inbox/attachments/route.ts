import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  inboxActor,
  inboxConversation,
  checkInboxActor,
  inboxActivity,
} from "@/lib/partner-inbox-access";
import { scanAndStoreInboxAttachment } from "@/lib/partner-inbox-attachments";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGE_BYTES,
} from "@/lib/partner-inbox-policy";
import { isSameOriginPushRequest } from "@/lib/mover-push-policy";
import { deletePrivateDocument } from "@/lib/private-storage";
import { fail, locked } from "@/lib/recruitment";
import { rateLimit } from "@/lib/rate-limit";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(req: NextRequest) {
  let stored:
    | Awaited<ReturnType<typeof scanAndStoreInboxAttachment>>
    | undefined;
  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      req.nextUrl.protocol.replace(":", "");
    if (
      !isSameOriginPushRequest(req.headers.get("origin"), host, protocol) ||
      !req.headers.get("content-type")?.startsWith("multipart/form-data")
    )
      fail("Invalid upload origin.", 403);
    const actor = await inboxActor(true);
    if (!rateLimit(`inbox-upload:${actor.id}`, 15).allowed)
      fail("Please slow down.", 429);
    const reader = req.body?.getReader();
    if (!reader) fail("Upload is empty.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > MAX_ATTACHMENT_BYTES + 65536) {
        await reader.cancel();
        fail("Upload exceeds 10 MB.", 413);
      }
      chunks.push(item.value);
    }
    const form = await new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: new Uint8Array(Buffer.concat(chunks)),
    }).formData();
    const id = String(form.get("messageId") || "");
    const file = form.get("file");
    if (!(file instanceof File)) fail("Select a file.");
    const draft = await prisma.partnerMessage.findUnique({
      where: { id },
      include: { attachments: true },
    });
    if (
      !draft ||
      draft.status !== "DRAFT" ||
      (draft.authorId !== actor.id && actor.role !== "OWNER")
    )
      fail("Editable draft not found.", 404);
    await prisma.$transaction((tx) =>
      inboxConversation(tx, actor, draft.conversationId),
    );
    if (
      draft.attachments.length >= 10 ||
      draft.attachments.reduce((sum, item) => sum + item.size, 0) + file.size >
        MAX_MESSAGE_BYTES
    )
      fail("Attachment count or combined size limit reached.");
    stored = await scanAndStoreInboxAttachment(
      Buffer.from(await file.arrayBuffer()),
      file.name,
    );
    const result = await locked(async (tx) => {
      await checkInboxActor(tx, actor, true);
      await inboxConversation(tx, actor, draft.conversationId);
      const current = await tx.partnerMessage.findUniqueOrThrow({
        where: { id },
        include: { attachments: true },
      });
      if (current.status !== "DRAFT" || current.version !== draft.version)
        fail("Draft changed during upload. Try again.", 409);
      if (
        current.attachments.length >= 10 ||
        current.attachments.reduce((sum, item) => sum + item.size, 0) +
          stored!.size >
          MAX_MESSAGE_BYTES
      )
        fail("Attachment limit reached.");
      const attachment = await tx.partnerAttachment.create({
        data: { messageId: id, ...stored! },
      });
      await tx.partnerMessage.update({
        where: { id },
        data: { version: { increment: 1 }, draftDirty: true },
      });
      await inboxActivity(
        tx,
        draft.conversationId,
        actor.id,
        "attachment_added",
      );
      return {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        scanStatus: attachment.scanStatus,
      };
    });
    return NextResponse.json(result, { headers });
  } catch {
    if (stored)
      await deletePrivateDocument(stored.storageKey).catch(() => undefined);
    return NextResponse.json(
      {
        error:
          "Attachment upload failed. Check its type, size, scanning service and draft ownership.",
      },
      { status: 400, headers },
    );
  }
}
