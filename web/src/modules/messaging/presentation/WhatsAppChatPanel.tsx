"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "cn";
import { LinkWhatsAppResponse } from "@/modules/messaging/domain/messaging.types";

export type WhatsAppChatMessage = { from: "user" | "bot"; text: string };

interface WhatsAppChatPanelProps {
  linkData: LinkWhatsAppResponse;
  chatHistory: WhatsAppChatMessage[];
}

export function WhatsAppChatPanel({
  linkData,
  chatHistory,
}: WhatsAppChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [chatHistory]);

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Estado de enlace</dt>
          <dd className="font-bold text-foreground">{linkData.status}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Código de verificación</dt>
          <dd className="font-mono text-base font-bold text-primary">
            {linkData.verificationCode}
          </dd>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{linkData.instructions}</p>
      </dl>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversación con el bot"
        className="flex h-64 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-background p-3 text-sm"
      >
        {chatHistory.length === 0 ? (
          <div className="my-auto text-center text-muted-foreground">
            Escribí un mensaje para interactuar con el bot
          </div>
        ) : (
          chatHistory.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                item.from === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  item.from === "user"
                    ? "rounded-br-md bg-success text-success-foreground"
                    : "rounded-bl-md border border-border bg-muted text-foreground"
                )}
              >
                {item.text}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
