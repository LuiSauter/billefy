import { IHttpClient } from "@/shared/application/http-client.contract";
import { WebPushApiRepository } from "../infrastructure/web-push-api.repository";

const SERVICE_WORKER_PATH = "/sw.js";

// Users for whom a subscribe attempt already ran during this page load.
const attemptedUserIds = new Set<string>();

/** Converts a base64url VAPID public key into the bytes `PushManager.subscribe` expects. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

/**
 * Registers the service worker. Independent of push permission; never throws.
 */
export async function registerServiceWorker(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  } catch {
    // Best-effort: the app works fully without a service worker.
  }
}

/**
 * Asks for notification permission (unless already decided) and subscribes the
 * browser to Web Push, persisting the subscription on the backend. Runs at most
 * once per user per page load. Never throws and never blocks: declining or any
 * failure leaves the rest of the app untouched (Spec S3).
 */
export async function requestWebPushSubscriptionOnce(
  http: IHttpClient,
  userId: string
): Promise<void> {
  try {
    if (attemptedUserIds.has(userId)) return;
    attemptedUserIds.add(userId);

    if (!isPushSupported()) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;

    if (Notification.permission === "denied") return;

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys?.auth) return;

    await new WebPushApiRepository(http).subscribe({
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
    });
  } catch {
    // Intentionally silent: push is best-effort and must never surface errors.
  }
}
