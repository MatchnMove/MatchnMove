export type InstallPlatform = "ios" | "android" | "desktop";

export function getInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  return /Android/i.test(userAgent) ? "android" : "desktop";
}

export function applicationServerKey(value: string): ArrayBuffer {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export async function registerMoverAppWorker() {
  await navigator.serviceWorker.register("/mover-sw.js", { scope: "/mover/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function disconnectMoverPushDevice() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/mover/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  // Remove the server binding first; unsubscribe even if the request fails so a
  // signed-out device cannot continue receiving this account's notifications.
  try {
    await fetch("/api/mover/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  } finally { await subscription.unsubscribe(); }
}
