export interface LinkWhatsAppRequest {
  phoneNumber: string;
}

export interface LinkWhatsAppResponse {
  linkId: string;
  phoneNumber: string;
  verificationCode: string;
  status: string;
  instructions: string;
}

export interface WhatsAppWebhookRequest {
  providerMessageId: string;
  fromNumber: string;
  messageText: string;
}

export interface WhatsAppWebhookResponse {
  processed: boolean;
  replyText?: string;
  actionTaken?: string;
}

export interface IMessagingRepository {
  linkWhatsApp(req: LinkWhatsAppRequest): Promise<LinkWhatsAppResponse>;
  sendWhatsAppWebhook(req: WhatsAppWebhookRequest): Promise<WhatsAppWebhookResponse>;
}
