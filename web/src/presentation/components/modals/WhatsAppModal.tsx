import React, { useState } from "react";
import { LinkWhatsAppResponse } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkPhone: (phone: string) => Promise<LinkWhatsAppResponse>;
  onSendMessage: (msg: string) => Promise<string | undefined>;
}

export function WhatsAppModal({
  isOpen,
  onClose,
  onLinkPhone,
  onSendMessage,
}: WhatsAppModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [linkData, setLinkData] = useState<LinkWhatsAppResponse | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ from: "user" | "bot"; text: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setSubmitting(true);
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
      alert(err instanceof Error ? err.message : "Error al vincular WhatsApp.");
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>💬</span> Bot de WhatsApp & Ingesta Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!linkData ? (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Ingresa tu número de teléfono con código de país para vincular tu chat de WhatsApp con Billefy.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="whatsappPhone">Número con código de país</Label>
                <Input
                  id="whatsappPhone"
                  required
                  placeholder="+591 70000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !phoneNumber.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Vinculando..." : "Generar Código de Enlace"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <div>Estado de enlace: <b>{linkData.status}</b></div>
                <div>Código de verificación: <b className="font-mono text-sm text-primary">{linkData.verificationCode}</b></div>
                <div className="text-muted-foreground text-xs">{linkData.instructions}</div>
              </div>

              {/* Chat Simulation Sandbox */}
              <div className="border rounded-lg p-3 bg-background/50 h-52 overflow-y-auto space-y-2 text-xs">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    Escribe un mensaje para interactuar con el bot
                  </div>
                ) : (
                  chatHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex ${item.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-1.5 ${
                          item.from === "user"
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-foreground border"
                        }`}
                      >
                        {item.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Ej. Gasto 45 bs en taxi..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Enviar
                </Button>
              </form>

              <div className="flex justify-end pt-2 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
