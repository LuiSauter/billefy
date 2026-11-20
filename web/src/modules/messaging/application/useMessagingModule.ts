"use client";

import { useMemo, useCallback } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { MessagingApiRepository } from "../infrastructure/messaging-api.repository";

export function useMessagingModule(
  http: IHttpClient | null,
  onDraftsImpacted?: () => Promise<void>
) {
  const repo = useMemo(
    () => (http ? new MessagingApiRepository(http) : null),
    [http]
  );

  const linkWhatsApp = useCallback(
    async (phoneNumber: string) => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.linkWhatsApp({ phoneNumber });
    },
    [repo]
  );

  const sendWhatsAppWebhook = useCallback(
    async (fromNumber: string, messageText: string) => {
      if (!repo) throw new Error("Cliente no inicializado");
      const msgId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "msg-test";
      const res = await repo.sendWhatsAppWebhook({
        providerMessageId: msgId,
        fromNumber,
        messageText,
      });
      await onDraftsImpacted?.();
      return res.replyText;
    },
    [repo, onDraftsImpacted]
  );

  return {
    linkWhatsApp,
    sendWhatsAppWebhook,
  };
}
