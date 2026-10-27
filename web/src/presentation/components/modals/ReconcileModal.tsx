import { useState, useEffect } from "react";
import { AccountDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReconcileModalProps {
  isOpen: boolean;
  account: AccountDto | null;
  onClose: () => void;
  onSubmit: (accountId: string, realBalance: number, notes?: string) => Promise<void>;
}

export function ReconcileModal({ isOpen, account, onClose, onSubmit }: ReconcileModalProps) {
  const [realBalance, setRealBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setRealBalance(account.balance.toString());
      setNotes("");
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const realNum = parseFloat(realBalance);
    if (isNaN(realNum)) return;

    setSubmitting(true);
    try {
      await onSubmit(account.id, realNum, notes.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const realVal = parseFloat(realBalance);
  const diff = isNaN(realVal) ? 0 : realVal - account.balance.toNumber();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Conciliar Saldo: {account.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-xs space-y-1">
              <div>
                Saldo actual en el Libro Mayor:{" "}
                <span className="font-mono font-bold">
                  {account.balance.toFixed(2)} {account.currency}
                </span>
              </div>
              <div className="text-muted-foreground">
                Si el saldo real de tu extracto difiere, el sistema registrará un movimiento de ajuste automático (ACC-06).
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reconcileRealBalance">Saldo Real Verificado ({account.currency})</Label>
              <Input
                id="reconcileRealBalance"
                type="number"
                step="0.01"
                required
                value={realBalance}
                onChange={(e) => setRealBalance(e.target.value)}
              />
            </div>

            <div
              className={`text-xs font-mono font-semibold ${
                diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              Diferencia calculada: {diff > 0 ? "+" : ""}
              {diff.toFixed(2)} {account.currency}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reconcileNotes">Nota o motivo de la conciliación (opcional)</Label>
              <Input
                id="reconcileNotes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Extracto mensual del banco"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Conciliando..." : "Aplicar Ajuste"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
