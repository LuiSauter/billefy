import { useState } from "react";
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
  const [incomeAmount, setIncomeAmount] = useState("4500");
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
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="BOB">Bolivianos (BOB)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              Calcular Propuesta
            </Button>
          </form>

          {proposal && (
            <div className="mt-4 p-4 bg-muted/40 rounded-lg border space-y-3 text-xs">
              <p className="text-muted-foreground">{proposal.rationale}</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 bg-background border rounded-md">
                  <div className="text-muted-foreground font-semibold">Necesidades ({proposal.needsPercentage}%)</div>
                  <div className="text-base font-bold font-mono text-primary mt-0.5">
                    {proposal.needsAmount.toFixed(2)} {proposal.currency}
                  </div>
                </div>
                <div className="p-2.5 bg-background border rounded-md">
                  <div className="text-muted-foreground font-semibold">Deseos ({proposal.wantsPercentage}%)</div>
                  <div className="text-base font-bold font-mono text-amber-600 mt-0.5">
                    {proposal.wantsAmount.toFixed(2)} {proposal.currency}
                  </div>
                </div>
                {proposal.debtPercentage > 0 && (
                  <div className="p-2.5 bg-background border rounded-md">
                    <div className="text-muted-foreground font-semibold">Deudas ({proposal.debtPercentage}%)</div>
                    <div className="text-base font-bold font-mono text-purple-600 mt-0.5">
                      {proposal.debtPaymentAmount.toFixed(2)} {proposal.currency}
                    </div>
                  </div>
                )}
                <div className="p-2.5 bg-background border rounded-md">
                  <div className="text-muted-foreground font-semibold">Ahorro ({proposal.savingsPercentage}%)</div>
                  <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                    {proposal.savingsAmount.toFixed(2)} {proposal.currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
