import { useState } from "react";
import { CreateBudgetRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateBudgetRequest) => Promise<void>;
}

export function CreateBudgetModal({ isOpen, onClose, onSubmit }: CreateBudgetModalProps) {
  const [limit, setLimit] = useState("1500");
  const [currency, setCurrency] = useState("BOB");
  const [threshold, setThreshold] = useState("0.80");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(limit);
    const thresholdNum = parseFloat(threshold);
    if (isNaN(limitNum) || limitNum <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        limitAmount: limitNum,
        currency,
        alertThreshold: isNaN(thresholdNum) ? 0.8 : thresholdNum,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Definir Presupuesto Mensual</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="budgetLimit">Monto Límite Mensual</Label>
              <Input
                id="budgetLimit"
                type="number"
                step="0.01"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budgetCurrency">Moneda</Label>
              <select
                id="budgetCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="BOB">Bolivianos (BOB)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budgetThreshold">Umbral de Alerta Temprana (ej. 0.80 = 80%)</Label>
              <Input
                id="budgetThreshold"
                type="number"
                step="0.05"
                min="0.10"
                max="1.00"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Crear Presupuesto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
