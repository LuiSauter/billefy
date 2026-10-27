import { useState } from "react";
import { AccountType, CreateAccountRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateAccountRequest) => Promise<void>;
}

export function CreateAccountModal({ isOpen, onClose, onSubmit }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Bank");
  const [currency, setCurrency] = useState("BOB");
  const [initialBalance, setInitialBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), type, currency, initialBalance });
      setName("");
      setInitialBalance("0");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Crear Nueva Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="accountName">Nombre de la cuenta</Label>
              <Input
                id="accountName"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Banco Unión, Billetera USDT"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountType">Tipo de cuenta</Label>
              <select
                id="accountType"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Bank">Banco</option>
                <option value="Wallet">Billetera Digital</option>
                <option value="Cash">Efectivo</option>
                <option value="Exchange">Exchange (Crypto)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountCurrency">Moneda</Label>
              <select
                id="accountCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="BOB">Bolivianos (BOB)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initialBalance">Saldo Inicial</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar en Base de Datos"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
