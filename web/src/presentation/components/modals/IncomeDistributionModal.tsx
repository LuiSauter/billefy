import React, { useState } from "react";
import { IncomeDistributionProposal, ProposeIncomeDistributionRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IncomeDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (req: ProposeIncomeDistributionRequest) => Promise<IncomeDistributionProposal>;
}

export function IncomeDistributionModal({
  isOpen,
  onClose,
  onCalculate,
}: IncomeDistributionModalProps) {
  const [incomeAmount, setIncomeAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [proposal, setProposal] = useState<IncomeDistributionProposal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    try {
      const res = await onCalculate({
        incomeAmount: amount,
        currency,
      });
      setProposal(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al calcular propuesta.");
    } finally {
      setSubmitting(false);
    }
  };

  const amountNum = parseFloat(incomeAmount) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>💡</span> Asistente de Distribución de Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="distributeIncome">Monto de Ingreso / Sueldo</Label>
                <Input
                  id="distributeIncome"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="distributeCurr">Moneda</Label>
                <select
                  id="distributeCurr"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="BOB">BOB (Bolivianos)</option>
                  <option value="USD">USD (Dólares)</option>
                  <option value="USDT">USDT (Crypto)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button
                type="submit"
                disabled={submitting || amountNum <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? "Calculando..." : "Calcular Distribución 50/30/20"}
              </Button>
            </div>
          </form>

          {proposal && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/40 space-y-3">
              <div className="text-sm font-semibold text-foreground">
                Regla 50/30/20 & Cobertura de Préstamos:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 border rounded bg-background">
                  <div className="text-muted-foreground">Necesidades (50%)</div>
                  <div className="font-bold text-sm font-mono text-blue-600">
                    {proposal.needsAmount.toFixed(2)} {currency}
                  </div>
                </div>
                <div className="p-2 border rounded bg-background">
                  <div className="text-muted-foreground">Deseos (30%)</div>
                  <div className="font-bold text-sm font-mono text-amber-600">
                    {proposal.wantsAmount.toFixed(2)} {currency}
                  </div>
                </div>
                <div className="p-2 border rounded bg-background">
                  <div className="text-muted-foreground">Ahorros (20%)</div>
                  <div className="font-bold text-sm font-mono text-emerald-600">
                    {proposal.savingsAmount.toFixed(2)} {currency}
                  </div>
                </div>
              </div>
              {proposal.debtPaymentAmount > 0 && (
                <div className="text-xs p-2 bg-purple-50 text-purple-800 rounded border border-purple-200">
                  Reserva para cuotas de préstamos: <b>{proposal.debtPaymentAmount.toFixed(2)} {currency}</b>
                </div>
              )}
              <div className="text-xs text-muted-foreground italic">
                {proposal.rationale}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
