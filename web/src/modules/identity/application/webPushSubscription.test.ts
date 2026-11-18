import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IHttpClient } from "@/shared/application/http-client.contract";

const VAPID_KEY = "AQID-_--"; // base64url for bytes 01 02 03 fb ff be

type Permission = "default" | "granted" | "denied";

interface Env {
  permission: Permission;
  requestPermission: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  http: IHttpClient;
}

const subscriptionJson = {
  endpoint: "https://push.example/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

function installBrowser(
  permission: Permission,
  options: { requestResult?: Permission; serviceWorker?: boolean; pushManager?: boolean } = {}
): Env {
  const subscribe = vi.fn(async () => ({ toJSON: () => subscriptionJson }));
  const requestPermission = vi.fn(async () => options.requestResult ?? "granted");
  const notification = { permission, requestPermission };
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("navigator", {
    ...(options.serviceWorker === false
      ? {}
      : { serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) } }),
  });
  vi.stubGlobal("window", options.pushManager === false ? {} : { PushManager: class {} });
  const post = vi.fn(async () => undefined);
  const http = { post } as unknown as IHttpClient;
  return Object.assign(notification, { subscribe, post, http }) as unknown as Env;
}

async function load() {
  vi.resetModules();
  return import("./webPushSubscription");
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", VAPID_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("urlBase64ToUint8Array", () => {
  it("decodes url-safe base64 and restores missing padding", async () => {
    const { urlBase64ToUint8Array } = await load();
    expect(Array.from(urlBase64ToUint8Array("AQID-_--"))).toEqual([1, 2, 3, 0xfb, 0xff, 0xbe]);
    expect(Array.from(urlBase64ToUint8Array("AQI"))).toEqual([1, 2]);
    expect(Array.from(urlBase64ToUint8Array("AQ"))).toEqual([1]);
  });
});

describe("requestWebPushSubscriptionOnce", () => {
  it("is a no-op when service workers are not supported", async () => {
    const env = installBrowser("default", { serviceWorker: false });
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.requestPermission).not.toHaveBeenCalled();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("is a no-op when PushManager is not supported", async () => {
    const env = installBrowser("default", { pushManager: false });
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.requestPermission).not.toHaveBeenCalled();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("is a no-op when the VAPID public key is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    const env = installBrowser("default");
    const { requestWebPushSubscriptionOnce } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");
    expect(env.requestPermission).not.toHaveBeenCalled();
    expect(env.subscribe).not.toHaveBeenCalled();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("never re-prompts when permission was already denied", async () => {
    const env = installBrowser("denied");
    const { requestWebPushSubscriptionOnce } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");
    expect(env.requestPermission).not.toHaveBeenCalled();
    expect(env.subscribe).not.toHaveBeenCalled();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("does nothing when the prompt is answered with denied/dismissed", async () => {
    for (const result of ["denied", "default"] as const) {
      const env = installBrowser("default", { requestResult: result });
      const { requestWebPushSubscriptionOnce } = await load();
      await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
      expect(env.requestPermission).toHaveBeenCalledTimes(1);
      expect(env.subscribe).not.toHaveBeenCalled();
      expect(env.post).not.toHaveBeenCalled();
    }
  });

  it("subscribes and posts the mapped body after the prompt is granted", async () => {
    const env = installBrowser("default", { requestResult: "granted" });
    const { requestWebPushSubscriptionOnce, urlBase64ToUint8Array } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");

    expect(env.requestPermission).toHaveBeenCalledTimes(1);
    expect(env.subscribe).toHaveBeenCalledExactlyOnceWith({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });
    expect(env.post).toHaveBeenCalledExactlyOnceWith("/api/v1/notifications/web-push/subscribe", {
      endpoint: "https://push.example/abc",
      p256dhKey: "p256dh-key",
      authKey: "auth-key",
    });
  });

  it("skips the prompt but still subscribes when permission was granted in a prior session", async () => {
    const env = installBrowser("granted");
    const { requestWebPushSubscriptionOnce } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");
    expect(env.requestPermission).not.toHaveBeenCalled();
    expect(env.subscribe).toHaveBeenCalledTimes(1);
    expect(env.post).toHaveBeenCalledTimes(1);
  });

  it("swallows a throwing pushManager.subscribe()", async () => {
    const env = installBrowser("granted");
    env.subscribe.mockRejectedValueOnce(new Error("bad key"));
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("swallows a rejecting requestPermission()", async () => {
    const env = installBrowser("default");
    env.requestPermission.mockRejectedValueOnce(new Error("boom"));
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("swallows a rejecting backend POST", async () => {
    const env = installBrowser("granted");
    env.post.mockRejectedValueOnce(new Error("network down"));
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.post).toHaveBeenCalledTimes(1);
  });

  it("does not post when the subscription lacks keys", async () => {
    const env = installBrowser("granted");
    env.subscribe.mockResolvedValueOnce({ toJSON: () => ({ endpoint: "https://push.example/abc" }) });
    const { requestWebPushSubscriptionOnce } = await load();
    await expect(requestWebPushSubscriptionOnce(env.http, "u1")).resolves.toBeUndefined();
    expect(env.post).not.toHaveBeenCalled();
  });

  it("attempts only once per user per page load", async () => {
    const env = installBrowser("granted");
    const { requestWebPushSubscriptionOnce } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");
    await requestWebPushSubscriptionOnce(env.http, "u1");
    expect(env.post).toHaveBeenCalledTimes(1);

    await requestWebPushSubscriptionOnce(env.http, "u2");
    expect(env.post).toHaveBeenCalledTimes(2);
  });

  it("does not re-prompt within the same session after a denied answer", async () => {
    const env = installBrowser("default", { requestResult: "denied" });
    const { requestWebPushSubscriptionOnce } = await load();
    await requestWebPushSubscriptionOnce(env.http, "u1");
    await requestWebPushSubscriptionOnce(env.http, "u1");
    expect(env.requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe("registerServiceWorker", () => {
  it("is a no-op without service worker support", async () => {
    vi.stubGlobal("navigator", {});
    const { registerServiceWorker } = await load();
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("registers /sw.js regardless of push permission", async () => {
    const register = vi.fn(async () => ({}));
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    vi.stubGlobal("Notification", { permission: "denied" });
    const { registerServiceWorker } = await load();
    await registerServiceWorker();
    expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js");
  });

  it("swallows registration failures", async () => {
    const register = vi.fn(async () => {
      throw new Error("insecure context");
    });
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    const { registerServiceWorker } = await load();
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});
