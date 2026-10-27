import { useState } from "react";
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
  const [phoneNumber, setPhoneNumber] = useState("+591 700 00000");
  const [linkData, setLinkData] = useState<LinkWhatsAppResponse | null>(null);
  const [inputMessage, setInputMessage] = useState("Gasto 45 bs en taxi");
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
            <span>💬</span> Bot de WhatsApp (Simulador)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!linkData ? (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Vincula tu número de teléfono. El bot responderá exclusivamente a los mensajes que tú inicies (Regla 21).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="waPhone">Número de WhatsApp</Label>
                <Input
                  id="waPhone"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+59170011223"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Generar Código de Vinculación
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                <div>
                  Código asignado: <span className="font-mono font-bold text-primary">{linkData.verificationCode}</span>
                </div>
                <div className="text-muted-foreground">{linkData.instructions}</div>
              </div>

              <div className="h-64 border rounded-md p-3 overflow-y-auto space-y-2 bg-muted/20 text-xs">
                {chatHistory.map((c, i) => (
                  <div key={i} className={`flex ${c.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`p-2.5 rounded-lg max-w-[85%] whitespace-pre-line ${
                        c.from === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border text-card-foreground shadow-xs"
                      }`}
                    >
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe un mensaje (ej. 1, Saldo, Gasto 40 bs)..."
                  className="text-xs"
                />
                <Button type="submit" size="sm">
                  Enviar
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
