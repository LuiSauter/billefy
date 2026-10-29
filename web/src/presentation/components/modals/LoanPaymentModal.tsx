import { useState } from "react";
import { AccountDto, RegisterLoanPaymentRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoanPaymentModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: RegisterLoanPaymentRequest) => Promise<void>;
}

export function LoanPaymentModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}: LoanPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Registrar Pago a Préstamo</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              El pago se imputará en cascada estricta (Mora $\rightarrow$ Interés Corriente $\rightarrow$ Capital) cubriendo las cuotas más antiguas primero (LOAN_ENGINE.md).
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="paymentAmount">Monto Pagado</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentAccount">Imputar en Cuenta del Libro Mayor (opcional)</Label>
              <select
                id="paymentAccount"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">(Sin registrar movimiento en cuenta bancaria)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentNote">Nota del Pago (opcional)</Label>
              <Input
                id="paymentNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej. Pago cuota 1 en efectivo"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? "Aplicando..." : "Confirmar Pago"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
