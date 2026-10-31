import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inboxActor, inboxConversation } from "@/lib/partner-inbox-access";
import { inboxAttachmentBytes } from "@/lib/partner-inbox-attachments";
import { cleanFileName } from "@/lib/partner-inbox-policy";
import { rateLimit } from "@/lib/rate-limit";
import { checkInboxActor, inboxActivity } from "@/lib/partner-inbox-access";
import { locked } from "@/lib/recruitment";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await inboxActor();
    if (!rateLimit(`inbox-file:${actor.id}`, 30).allowed)
      return NextResponse.json(
        { error: "Please slow down." },
        { status: 429, headers },
      );
    const { id } = await context.params;
    const attachment = await prisma.partnerAttachment.findUnique({
      where: { id },
      include: { message: { select: { conversationId: true } } },
    });
    if (!attachment)
      return NextResponse.json(
        { error: "Attachment not found." },
        { status: 404, headers },
      );
    await prisma.$transaction((tx) =>
      inboxConversation(tx, actor, attachment.message.conversationId),
    );
    const { bytes } = await inboxAttachmentBytes(id);
    await locked(async (tx) => {
      await checkInboxActor(tx, actor);
      await inboxConversation(tx, actor, attachment.message.conversationId);
      await inboxActivity(
        tx,
        attachment.message.conversationId,
        actor.id,
        "attachment_downloaded",
      );
    });
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(cleanFileName(attachment.fileName))}`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Attachment unavailable. It may require scanning or mailbox reconnection.",
      },
      { status: 403, headers },
    );
  }
}
