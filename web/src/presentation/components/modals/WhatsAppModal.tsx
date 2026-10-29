"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import { cn } from "cn";
import { LinkWhatsAppResponse } from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkPhone: (phone: string) => Promise<LinkWhatsAppResponse>;
  onSendMessage: (msg: string) => Promise<string | undefined>;
}

type ChatMessage = { from: "user" | "bot"; text: string };

const LINK_FORM_ID = "whatsapp-link-form";

export function WhatsAppModal({
  isOpen,
  onClose,
  onLinkPhone,
  onSendMessage,
}: WhatsAppModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [linkData, setLinkData] = useState<LinkWhatsAppResponse | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset the flow whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber("");
      setLinkData(null);
      setInputMessage("");
      setChatHistory([]);
      setError(undefined);
    }
  }, [isOpen]);

  // Keep the latest message in view.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [chatHistory]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const res = await onLinkPhone(phoneNumber.trim());
      setLinkData(res);
      setChatHistory([
        {
          from: "bot",
          text: `Para vincular tu cuenta, envía el código «${res.verificationCode}» o «CONFIRMAR» por este chat.`,
        },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al vincular WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const msg = inputMessage.trim();
    setChatHistory((prev) => [...prev, { from: "user", text: msg }]);
    setInputMessage("");

    try {
      const reply = await onSendMessage(msg);
      if (reply) {
        setChatHistory((prev) => [...prev, { from: "bot", text: reply }]);
      }
    } catch {
      setChatHistory((prev) => [...prev, { from: "bot", text: "Error procesando el mensaje." }]);
    }
  };

  const title = (
    <span className="flex items-center gap-2">
      <MessageCircle aria-hidden="true" className="size-5 text-success" />
      Bot de WhatsApp e ingesta automática
    </span>
  );

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={
        linkData
          ? "Paso 2 de 2 · Probá el chat con el bot"
          : "Paso 1 de 2 · Vinculá tu número de teléfono"
      }
      footer={
        !linkData ? (
          <>
            <Button
              type="submit"
              form={LINK_FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!phoneNumber.trim()}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              {submitting ? "Vinculando..." : "Generar Código de Enlace"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
            >
              Cancelar
            </Button>
          </>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <form onSubmit={handleSend} className="flex w-full items-center gap-2">
              <Input
                aria-label="Mensaje para el bot"
                placeholder="Ej. Gasto 45 bs en taxi..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={!inputMessage.trim()}
                aria-label="Enviar mensaje"
                className="shrink-0"
              >
                <SendHorizontal />
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="w-full md:hidden"
            >
              Cerrar
            </Button>
          </div>
        )
      }
    >
      {!linkData ? (
        <form id={LINK_FORM_ID} onSubmit={handleLink} className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Ingresá tu número de teléfono con código de país para vincular tu chat de WhatsApp con Billefy.
          </p>
          <FormField label="Número con código de país" required error={error}>
            {(control) => (
              <Input
                {...control}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+591 70000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            )}
          </FormField>
        </form>
      ) : (
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
                  className={cn("flex", item.from === "user" ? "justify-end" : "justify-start")}
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
      )}
    </ResponsiveDrawer>
  );
}
