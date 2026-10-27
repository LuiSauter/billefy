import { useState } from "react";
import { AccountDto, RegisterTransactionRequest, TransactionDirection } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterTransactionModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  defaultAccountId: string;
  onClose: () => void;
  onSubmit: (req: RegisterTransactionRequest) => Promise<void>;
}

export function RegisterTransactionModal({
  isOpen,
  accounts,
  defaultAccountId,
  onClose,
  onSubmit,
}: RegisterTransactionModalProps) {
  const [accountId, setAccountId] = useState(defaultAccountId || (accounts[0]?.id ?? ""));
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        accountId: accountId || defaultAccountId,
        amount,
        direction,
        description: description.trim() || undefined,
      });
      setAmount("");
      setDescription("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Registrar Movimiento en Servidor</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="txnAccount">Cuenta</Label>
              <select
                id="txnAccount"
                value={accountId || defaultAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txnDirection">Tipo de Movimiento</Label>
              <select
                id="txnDirection"
                value={direction}
                onChange={(e) => setDirection(e.target.value as TransactionDirection)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Expense">Gasto (-)</option>
                <option value="Income">Ingreso (+)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txnAmount">Monto</Label>
              <Input
                id="txnAmount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txnDesc">Descripción</Label>
              <Input
                id="txnDesc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Almuerzo, Taxi, Sueldo"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? "Registrando..." : "Confirmar Movimiento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
