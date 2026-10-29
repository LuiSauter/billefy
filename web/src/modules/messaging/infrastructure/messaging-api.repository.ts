import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  IMessagingRepository,
  LinkWhatsAppRequest,
  LinkWhatsAppResponse,
  WhatsAppWebhookRequest,
  WhatsAppWebhookResponse,
} from "../domain/messaging.types";

export class MessagingApiRepository implements IMessagingRepository {
  constructor(private readonly http: IHttpClient) {}

  async linkWhatsApp(req: LinkWhatsAppRequest): Promise<LinkWhatsAppResponse> {
    return this.http.post<LinkWhatsAppResponse>("/v1/messaging/whatsapp/link", req);
  }

  async sendWhatsAppWebhook(
    req: WhatsAppWebhookRequest
  ): Promise<WhatsAppWebhookResponse> {
    return this.http.post<WhatsAppWebhookResponse>(
      "/v1/messaging/whatsapp/webhook",
      req
    );
  }
}
