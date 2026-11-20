import { describe, expect, it, vi } from "vitest";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { WebPushApiRepository } from "./web-push-api.repository";

function createHttp() {
  const post = vi.fn(async () => undefined);
  const del = vi.fn(async () => undefined);
  return { post, del, http: { post, delete: del } as unknown as IHttpClient };
}

describe("WebPushApiRepository", () => {
  it("posts the SubscribeWebPushRequest shape to the subscribe endpoint", async () => {
    const { post, http } = createHttp();
    await new WebPushApiRepository(http).subscribe({ endpoint: "https://p/e", p256dhKey: "k", authKey: "a" });
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/v1/notifications/web-push/subscribe", {
      endpoint: "https://p/e",
      p256dhKey: "k",
      authKey: "a",
    });
  });

  it("unsubscribes with the endpoint url-encoded in the query string and no body", async () => {
    const { del, http } = createHttp();
    await new WebPushApiRepository(http).unsubscribe("https://p/e?x=1&y=2");
    expect(del).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/notifications/web-push/subscribe?endpoint=https%3A%2F%2Fp%2Fe%3Fx%3D1%26y%3D2"
    );
  });
});
