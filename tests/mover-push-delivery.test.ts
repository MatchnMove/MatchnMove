import assert from "node:assert/strict";
import test from "node:test";
import webpush from "web-push";
import { prisma } from "../lib/db";
import { deliverMoverPush } from "../lib/mover-push";

test("push delivery claims once, retries outages, removes expired devices and protects lead ownership", async (t) => {
  const keys = webpush.generateVAPIDKeys();
  const oldPublic = process.env.VAPID_PUBLIC_KEY;
  const oldPrivate = process.env.VAPID_PRIVATE_KEY;
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  t.after(() => {
    if (oldPublic === undefined) delete process.env.VAPID_PUBLIC_KEY; else process.env.VAPID_PUBLIC_KEY = oldPublic;
    if (oldPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY; else process.env.VAPID_PRIVATE_KEY = oldPrivate;
  });
  const updates: Array<Record<string, unknown>> = [];
  let sends = 0;
  let deletes = 0;
  let providerStatus = 0;
  let claimCount = 1;
  const row = {
    id: "delivery", status: "QUEUED", kind: "TEST", attempts: 0,
    subscriptionId: "device", leadId: null as string | null, lead: null as unknown,
    expiresAt: new Date(Date.now() + 600_000),
    subscription: { endpoint: "https://web.push.apple.com/test", p256dh: "test", auth: "test",
      moverCompany: { id: "mover", status: "TEST", user: { role: "MOVER", email: "test@example.com" } } },
  };
  const originalFind = prisma.moverPushDelivery.findUnique;
  const originalUpdate = prisma.moverPushDelivery.updateMany;
  const originalDelete = prisma.moverPushSubscription.deleteMany;
  t.after(() => {
    prisma.moverPushDelivery.findUnique = originalFind;
    prisma.moverPushDelivery.updateMany = originalUpdate;
    prisma.moverPushSubscription.deleteMany = originalDelete;
  });
  prisma.moverPushDelivery.findUnique = (async () => row) as unknown as typeof originalFind;
  prisma.moverPushDelivery.updateMany = (async ({ data }: { data: Record<string, unknown> }) => {
    updates.push(data); return { count: data.status === "SENDING" ? claimCount : 1 };
  }) as unknown as typeof originalUpdate;
  prisma.moverPushSubscription.deleteMany = (async () => { deletes++; return { count: 1 }; }) as unknown as typeof originalDelete;
  t.mock.method(webpush, "sendNotification", async () => { sends++; if (providerStatus) throw { statusCode: providerStatus }; return { statusCode: 201 }; });

  assert.deepEqual(await deliverMoverPush("delivery"), { sent: true, queued: false });
  assert.equal(sends, 1);
  assert.equal(updates.at(-1)?.status, "SENT");
  row.status = "SENT";
  await deliverMoverPush("delivery");
  assert.equal(sends, 1, "a sent notification cannot be sent again");
  row.status = "QUEUED";
  claimCount = 0;
  await deliverMoverPush("delivery");
  assert.equal(sends, 1, "another worker owning the claim prevents a duplicate");
  claimCount = 1;
  providerStatus = 503;
  assert.deepEqual(await deliverMoverPush("delivery"), { sent: false, queued: true });
  assert.equal(updates.at(-1)?.status, "FAILED");
  assert.equal(updates.at(-1)?.attempts, 1);
  providerStatus = 410;
  assert.deepEqual(await deliverMoverPush("delivery"), { sent: false, queued: false, expired: true });
  assert.equal(deletes, 1);
  const previousSends = sends;
  row.kind = "LEAD";
  row.leadId = "lead";
  row.lead = { moverCompanyId: "someone-else", status: "NEW" };
  await deliverMoverPush("delivery");
  assert.equal(sends, previousSends, "test accounts and unowned leads cannot get customer alerts");
  assert.equal(updates.at(-1)?.status, "CANCELLED");
});
