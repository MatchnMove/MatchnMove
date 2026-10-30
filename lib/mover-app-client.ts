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

export function registerMoverAppWorker() { return registerAppWorker("/mover-sw.js", "/mover/"); }
export function registerPartnerAppWorker() { return registerAppWorker("/partner-sw.js", "/"); }
async function registerAppWorker(script: string, scope: string) {
  const registration = await navigator.serviceWorker.register(script, { scope, updateViaCache: "none" });
  if (registration.active?.state === "activated") return registration;
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error("Mover app setup did not start. Refresh the page and try again.");
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener("statechange", changed);
      if (error) reject(error); else resolve();
    };
    const changed = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") finish(new Error("Mover app setup failed. Check your connection and try again."));
    };
    const timer = setTimeout(() => finish(new Error("Mover app setup timed out. Refresh the page and try again.")), 15000);
    worker.addEventListener("statechange", changed);
    changed();
  });
  return registration;
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
