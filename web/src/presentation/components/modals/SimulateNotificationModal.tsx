import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SimulateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export function SimulateNotificationModal({
  isOpen,
  onClose,
  onSubmit,
}: SimulateNotificationModalProps) {
  const [text, setText] = useState("Transferencia recibida por Bs. 150.00 de Juan Pérez. Nro: 887711");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Simular Notificación Bancaria</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ingresá el texto de una notificación bancaria de prueba (Android). El motor extraerá monto, moneda y sentido con reglas y creará un borrador en tu bandeja.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="simulateText">Texto de la notificación</Label>
              <Input
                id="simulateText"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej. Transferencia recibida por Bs. 150.00 de Juan. Ref: 887711"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? "Capturando..." : "Ingestar Evento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
