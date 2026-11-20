"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import { LinkWhatsAppResponse } from "@/modules/messaging/domain/messaging.types";
import {
  WhatsAppChatMessage,
  WhatsAppChatPanel,
} from "@/modules/messaging/presentation/WhatsAppChatPanel";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkPhone: (phone: string) => Promise<LinkWhatsAppResponse>;
  onSendMessage: (msg: string) => Promise<string | undefined>;
}

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
  const [chatHistory, setChatHistory] = useState<WhatsAppChatMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber("");
      setLinkData(null);
      setInputMessage("");
      setChatHistory([]);
      setError(undefined);
    }
  }, [isOpen]);

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
          text: `Para vincular tu cuenta, envía el código «${res.verificationCode}» por este chat.`,
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
      setChatHistory((prev) => [
        ...prev,
        { from: "bot", text: "Error procesando el mensaje." },
      ]);
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
        <WhatsAppChatPanel linkData={linkData} chatHistory={chatHistory} />
      )}
    </ResponsiveDrawer>
  );
}
