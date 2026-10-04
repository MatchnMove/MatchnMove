import webpush from "web-push";
import { prisma } from "@/lib/db";
import { canMoverAccessLeads } from "@/lib/mover-lead-access";
import { getMoverPushPayload, isAllowedPushEndpoint, pushFailureAction } from "@/lib/mover-push-policy";

export function getMoverPushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return {
    ready: Boolean(publicKey && privateKey),
    publicKey: publicKey || null,
    privateKey: privateKey || "",
    subject: process.env.VAPID_SUBJECT || "mailto:support@matchnmove.co.nz",
  };
}

export async function deliverMoverPush(id: string) {
  const config = getMoverPushConfig();
  if (!config.ready) return { sent: false, queued: true };
  const delivery = await prisma.moverPushDelivery.findUnique({
    where: { id }, include: { subscription: { include: { moverCompany: { include: { user: true } } } }, lead: true },
  });
  if (!delivery || ["SENT", "CANCELLED"].includes(delivery.status)) return { sent: delivery?.status === "SENT", queued: false };
  if (delivery.attempts >= 5) return { sent: false, queued: false };
  const now = new Date();
  const mover = delivery.subscription.moverCompany;
  const allowed = delivery.kind === "TEST"
    ? ["ACTIVE", "TEST"].includes(mover.status)
    : canMoverAccessLeads(mover) && delivery.lead?.moverCompanyId === mover.id
      && ["NEW", "NOTIFIED", "VIEWED"].includes(delivery.lead.status)
      && (!delivery.lead.expiresAt || delivery.lead.expiresAt > now);
  if (!allowed || delivery.expiresAt <= now || !isAllowedPushEndpoint(delivery.subscription.endpoint)) {
    await prisma.moverPushDelivery.updateMany({ where: { id, status: { not: "SENT" } }, data: { status: "CANCELLED" } });
    return { sent: false, queued: false };
  }
  const claim = await prisma.moverPushDelivery.updateMany({
    where: { id, attempts: delivery.attempts, OR: [
      { status: { in: ["QUEUED", "FAILED"] }, nextAttemptAt: { lte: now } },
      { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 120_000) } },
    ] }, data: { status: "SENDING", attempts: { increment: 1 }, lastError: null },
  });
  if (claim.count !== 1) return { sent: false, queued: true };
  try {
    await webpush.sendNotification({ endpoint: delivery.subscription.endpoint, keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth } }, JSON.stringify(getMoverPushPayload(delivery.kind, delivery.leadId)), {
      vapidDetails: { subject: config.subject, publicKey: config.publicKey!, privateKey: config.privateKey },
      TTL: Math.min(3600, Math.max(1, Math.floor((delivery.expiresAt.getTime() - now.getTime()) / 1000))),
      urgency: "high", timeout: 10_000,
    });
    await prisma.moverPushDelivery.updateMany({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    return { sent: true, queued: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const action = pushFailureAction(statusCode);
    if (action === "remove") {
      await prisma.moverPushSubscription.deleteMany({ where: { id: delivery.subscriptionId } });
      return { sent: false, queued: false, expired: true };
    }
    const retry = action === "retry" && delivery.attempts + 1 < 5;
    await prisma.moverPushDelivery.updateMany({ where: { id }, data: {
      status: "FAILED", attempts: retry ? delivery.attempts + 1 : 5,
      nextAttemptAt: new Date(Date.now() + Math.min(60_000 * 2 ** delivery.attempts, 900_000)),
      lastError: statusCode ? `Push service returned ${statusCode}` : "Push service temporarily unreachable",
    } });
    return { sent: false, queued: retry };
  }
}

export async function notifyMoverPushForLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { moverCompany: { include: { user: true, pushSubscriptions: true } } } });
  if (!lead || !canMoverAccessLeads(lead.moverCompany)) return;
  const deliveries = await Promise.all(lead.moverCompany.pushSubscriptions.map((subscription) => prisma.moverPushDelivery.upsert({
    where: { dedupeKey: `lead:${leadId}:${subscription.id}` }, update: {},
    create: { dedupeKey: `lead:${leadId}:${subscription.id}`, subscriptionId: subscription.id, leadId, expiresAt: lead.expiresAt ?? new Date(Date.now() + 48 * 3600_000) },
  })));
  await Promise.allSettled(deliveries.map((delivery) => deliverMoverPush(delivery.id)));
}

export async function processMoverPushQueue(limit = 50) {
  if (!getMoverPushConfig().ready) return { processed: 0 };
  const now = new Date();
  const queued = await prisma.moverPushDelivery.findMany({ where: { attempts: { lt: 5 }, OR: [
    { status: { in: ["QUEUED", "FAILED"] }, nextAttemptAt: { lte: now } },
    { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 120_000) } },
  ] }, orderBy: { createdAt: "asc" }, take: Math.min(limit, 100), select: { id: true } });
  await Promise.allSettled(queued.map((row) => deliverMoverPush(row.id)));
  return { processed: queued.length };
}
