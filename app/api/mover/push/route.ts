import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { deliverMoverPush, getMoverPushConfig } from "@/lib/mover-push";
import { pushEndpointSchema, pushSubscriptionSchema } from "@/lib/mover-push-policy";
import { rateLimit } from "@/lib/rate-limit";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function getAccount() {
  const mover = await requireAuthenticatedMover();
  return mover && ["ACTIVE", "TEST"].includes(mover.status) ? mover : null;
}

export async function GET() {
  const mover = await getAccount();
  if (!mover) return json({ error: "Sign in to an active mover account." }, 401);
  const config = getMoverPushConfig();
  const subscriptions = await prisma.moverPushSubscription.findMany({ where: { moverCompanyId: mover.id }, select: { id: true, endpoint: true } });
  return json({ ready: config.ready, publicKey: config.publicKey, subscriptions });
}

function validRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin && request.headers.get("content-type")?.includes("application/json")
    && Number(request.headers.get("content-length") || 0) <= 8192;
}

export async function POST(request: NextRequest) {
  if (!validRequest(request)) return json({ error: "Invalid request origin or content." }, 403);
  const mover = await getAccount();
  if (!mover) return json({ error: "Sign in to an active mover account." }, 401);
  if (!rateLimit(`mover-push:${mover.id}`, 20).allowed) return json({ error: "Please wait a moment and try again." }, 429);
  if (!getMoverPushConfig().ready) return json({ error: "Phone notifications are temporarily unavailable. Email alerts still work." }, 503);
  const body = await request.json().catch(() => null);
  if (body?.action === "test") {
    if (!rateLimit(`mover-push-test:${mover.id}`, 3, 60_000).allowed) return json({ error: "Please wait a minute before sending another test." }, 429);
    const endpoint = pushEndpointSchema.safeParse(body.endpoint);
    if (!endpoint.success) return json({ error: "Enable notifications on this device first." }, 400);
    const subscription = await prisma.moverPushSubscription.findFirst({ where: { moverCompanyId: mover.id, endpoint: endpoint.data } });
    if (!subscription) return json({ error: "Enable notifications on this device first." }, 404);
    const delivery = await prisma.moverPushDelivery.create({ data: {
      dedupeKey: `test:${randomUUID()}`, subscriptionId: subscription.id, kind: "TEST", expiresAt: new Date(Date.now() + 600_000),
    } });
    const result = await deliverMoverPush(delivery.id);
    return json({ ...result, message: result.sent ? "Test sent. Look for a notification on this device." : result.queued ? "Test queued. It should arrive shortly." : "This device could not be reached. Turn notifications off, then enable them again." }, result.sent || result.queued ? 200 : 409);
  }
  const parsed = pushSubscriptionSchema.safeParse(body?.subscription);
  if (!parsed.success) return json({ error: "Your browser supplied an invalid notification subscription." }, 400);
  const existing = await prisma.moverPushSubscription.findUnique({ where: { endpoint: parsed.data.endpoint } });
  if (existing && existing.moverCompanyId !== mover.id) return json({ error: "Reconnect notifications on this device for your current account." }, 409);
  if (!existing && await prisma.moverPushSubscription.count({ where: { moverCompanyId: mover.id } }) >= 20) return json({ error: "This account has reached its device limit. Contact support." }, 409);
  // A same-device race may only refresh the keys, never change ownership.
  const saved = await prisma.moverPushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: {},
    create: { moverCompanyId: mover.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
  });
  if (saved.moverCompanyId !== mover.id) return json({ error: "Reconnect notifications for this account." }, 409);
  await prisma.moverPushSubscription.update({ where: { id: saved.id }, data: { p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth } });
  return json({ ok: true, subscriptionId: saved.id });
}

export async function DELETE(request: NextRequest) {
  if (!validRequest(request)) return json({ error: "Invalid request origin or content." }, 403);
  const mover = await requireAuthenticatedMover();
  if (!mover) return json({ error: "Sign in first." }, 401);
  const body = await request.json().catch(() => null);
  const endpoint = pushEndpointSchema.safeParse(body?.endpoint);
  if (!endpoint.success) return json({ error: "Invalid device subscription." }, 400);
  await prisma.moverPushSubscription.deleteMany({ where: { moverCompanyId: mover.id, endpoint: endpoint.data } });
  return json({ ok: true });
}
