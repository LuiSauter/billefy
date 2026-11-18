import { IHttpClient } from "@/shared/application/http-client.contract";

/** Mirrors backend `SubscribeWebPushRequest` (Notifications.Contracts). */
export interface SubscribeWebPushRequest {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

const WEB_PUSH_SUBSCRIBE_PATH = "/api/v1/notifications/web-push/subscribe";

export class WebPushApiRepository {
  constructor(private readonly http: IHttpClient) {}

  async subscribe(req: SubscribeWebPushRequest): Promise<void> {
    await this.http.post<unknown>(WEB_PUSH_SUBSCRIBE_PATH, req);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.http.delete<unknown>(
      `${WEB_PUSH_SUBSCRIBE_PATH}?endpoint=${encodeURIComponent(endpoint)}`
    );
  }
}
