import { useState } from "react";
import { AccountDto, CreateLoanRequest, LoanScheduleDto, LoanTemplate, SimulateLoanRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateLoanModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSimulate: (req: SimulateLoanRequest) => Promise<LoanScheduleDto>;
  onSubmit: (req: CreateLoanRequest) => Promise<void>;
}

export function CreateLoanModal({
  isOpen,
  accounts,
  onClose,
  onSimulate,
  onSubmit,
}: CreateLoanModalProps) {
  const [counterparty, setCounterparty] = useState("");
  const [type, setType] = useState<"Lent" | "Borrowed">("Lent");
  const [template, setTemplate] = useState<LoanTemplate>("FixedInstallment");
  const [principal, setPrincipal] = useState("1000");
  const [currency, setCurrency] = useState("BOB");
  const [rate, setRate] = useState("0.02");
  const [installments, setInstallments] = useState("12");
  const [disbursementAcc, setDisbursementAcc] = useState("");
  const [simulatedSchedule, setSimulatedSchedule] = useState<LoanScheduleDto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const n = parseInt(installments, 10);
    if (isNaN(p) || p <= 0 || isNaN(n) || n < 1) return;

    try {
      const schedule = await onSimulate({
        principal: p,
        rate: isNaN(r) ? 0 : r,
        template,
        totalInstallments: n,
      });
      setSimulatedSchedule(schedule);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al simular el cronograma.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterparty.trim()) return;

    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const n = parseInt(installments, 10);

    setSubmitting(true);
    try {
      await onSubmit({
        counterpartyName: counterparty.trim(),
        type,
        template,
        principal: p,
        currency,
        interestRate: isNaN(r) ? 0 : r,
        totalInstallments: n,
        disbursementAccountId: disbursementAcc || undefined,
      });
      setSimulatedSchedule(null);
      setCounterparty("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-xl bg-background border my-8">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Simular y Registrar Préstamo / Deuda</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loanCounterparty">Nombre de la Persona / Contraparte</Label>
                <Input
                  id="loanCounterparty"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Ej. Carlos Méndez"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loanType">Tipo de Operación</Label>
                <select
                  id="loanType"
                  value={type}
                  onChange={(e) => setType(e.target.value as "Lent" | "Borrowed")}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Lent">Dinero que yo presto (Cobrar)</option>
                  <option value="Borrowed">Dinero que me prestaron (Pagar)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loanPrincipal">Monto Capital</Label>
                <Input
                  id="loanPrincipal"
                  type="number"
                  step="0.01"
                  required
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loanCurrency">Moneda</Label>
                <select
                  id="loanCurrency"
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
                <Label htmlFor="loanTemplate">Sistema de Amortización</Label>
                <select
                  id="loanTemplate"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as LoanTemplate)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="FixedInstallment">Cuota Fija (Francés)</option>
                  <option value="SimpleOnBalance">Capital Fijo (Alemán)</option>
                  <option value="FlatOnInitialCapital">Interés Fijo s/ Capital (Flat)</option>
                  <option value="InterestOnly">Solo Intereses (Americano)</option>
                  <option value="NoInterest">Sin Interés</option>
                  <option value="SinglePaymentCompound">Pago Único Capitalizado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loanRate">Tasa de Interés Mensual (ej. 0.02 = 2%)</Label>
                <Input
                  id="loanRate"
                  type="number"
                  step="0.001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loanInstallments">Número de Cuotas</Label>
                <Input
                  id="loanInstallments"
                  type="number"
                  min="1"
                  max="120"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loanDisbursementAcc">Cuenta de desembolso en el Libro Mayor (opcional)</Label>
              <select
                id="loanDisbursementAcc"
                value={disbursementAcc}
                onChange={(e) => setDisbursementAcc(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">(Sin imputar en cuenta del Libro Mayor)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency} - Saldo: {a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleSimulate} className="text-xs">
                🔍 Calcular Cronograma y TEA
              </Button>
            </div>

            {simulatedSchedule && (
              <div className="mt-4 p-4 bg-muted/40 rounded-lg border space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Total Intereses: <span className="font-mono text-primary">{simulatedSchedule.totalInterest.toFixed(2)} {currency}</span></span>
                  <span>Total a Pagar: <span className="font-mono text-primary">{simulatedSchedule.totalToPay.toFixed(2)} {currency}</span></span>
                  <span>TEA (Costo Real): <span className="font-mono text-amber-600 font-bold">{(simulatedSchedule.annualEffectiveRate * 100).toFixed(2)}%</span></span>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y text-xs font-mono">
                  <div className="grid grid-cols-5 font-bold py-1 text-muted-foreground">
                    <span>#</span>
                    <span>Vencimiento</span>
                    <span>Capital</span>
                    <span>Interés</span>
                    <span>Total Cuota</span>
                  </div>
                  {simulatedSchedule.installments.map((inst) => (
                    <div key={inst.number} className="grid grid-cols-5 py-1">
                      <span>Cuota {inst.number}</span>
                      <span>{inst.dueDate}</span>
                      <span>{inst.principal.toFixed(2)}</span>
                      <span>{inst.interest.toFixed(2)}</span>
                      <span className="font-bold">{inst.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creando..." : "Guardar Préstamo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
