import { z } from "zod";

export function isSameOriginPushRequest(origin: string | null, host: string | null, protocol: string) {
  if (!origin || !host || !["https", "http"].includes(protocol)) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && parsed.host === host && parsed.protocol === `${protocol}:`;
  } catch { return false; }
}

export function isAllowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    return url.hostname === "fcm.googleapis.com"
      || url.hostname === "updates.push.services.mozilla.com"
      || url.hostname.endsWith(".push.services.mozilla.com")
      || url.hostname === "web.push.apple.com"
      || url.hostname.endsWith(".push.apple.com")
      || url.hostname.endsWith(".notify.windows.com");
  } catch { return false; }
}

export const pushEndpointSchema = z.string().min(1).max(2048).refine(isAllowedPushEndpoint, "Unsupported notification service.");
const key = (bytes: number) => z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).max(128).refine((value) => Buffer.from(value, "base64url").length === bytes);
export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpointSchema,
  keys: z.object({ p256dh: key(65).refine((value) => Buffer.from(value, "base64url")[0] === 4), auth: key(16) }),
});

export function getMoverPushPayload(kind: string, leadId?: string | null) {
  const test = kind === "TEST";
  return {
    title: test ? "You're connected to Match 'n Move" : "New moving quote available",
    body: test ? "Phone alerts are working. Tap to open your mover dashboard." : "A quote has matched your service area. Open the app to view your lead.",
    url: leadId ? `/mover/dashboard?tab=leads&lead=${encodeURIComponent(leadId)}` : "/mover/dashboard#install-app",
    tag: leadId ? `mover-lead-${leadId}` : "mover-push-test",
  };
}

export function pushFailureAction(statusCode?: number) {
  if (statusCode === 404 || statusCode === 410) return "remove";
  if (!statusCode || statusCode === 408 || statusCode === 429 || statusCode >= 500) return "retry";
  return "fail";
}
