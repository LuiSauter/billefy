import React, { useState } from "react";
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
  const [principal, setPrincipal] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [rate, setRate] = useState("");
  const [installments, setInstallments] = useState("");
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
        rateUnit: "NominalMonthly",
        totalInstallments: n,
        frequency: "Monthly",
        disbursementAccountId: disbursementAcc || undefined,
      });
      setPrincipal("");
      setRate("");
      setInstallments("");
      setCounterparty("");
      setSimulatedSchedule(null);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear el préstamo.");
    } finally {
      setSubmitting(false);
    }
  };

  const principalNum = parseFloat(principal) || 0;
  const installmentsNum = parseInt(installments, 10) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8 shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Simular / Registrar Préstamo</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="counterparty">Contraparte (Persona o Entidad)</Label>
                <Input
                  id="counterparty"
                  required
                  placeholder="Ej. Juan Pérez, Banco BCP"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loanType">Tipo de Operación</Label>
                <select
                  id="loanType"
                  value={type}
                  onChange={(e) => setType(e.target.value as "Lent" | "Borrowed")}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs"
                >
                  <option value="Lent">Dinero Prestado (Por Cobrar)</option>
                  <option value="Borrowed">Deuda Contraída (Por Pagar)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="template">Sistema de Amortización</Label>
                <select
                  id="template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as LoanTemplate)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs"
                >
                  <option value="FixedInstallment">Francés (Cuota Fija)</option>
                  <option value="Decreasing">Alemán (Capital Fijo)</option>
                  <option value="American">Americano (Interés Periódico)</option>
                  <option value="SingleEnd">Bullet (Pago Único al Vencer)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="principal">Capital Principal</Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Moneda</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs"
                >
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rate">Tasa Mensual Nominal (ej: 0.02 = 2%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.0001"
                  required
                  placeholder="0.02"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="installments">Número de Cuotas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  required
                  placeholder="12"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disbursementAcc">Cuenta de Desembolso</Label>
                <select
                  id="disbursementAcc"
                  value={disbursementAcc}
                  onChange={(e) => setDisbursementAcc(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs"
                >
                  <option value="">Sin desembolso en cuenta</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSimulate}
                disabled={principalNum <= 0 || installmentsNum < 1}
              >
                🔍 Simular Cronograma Exacto
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !counterparty.trim() || principalNum <= 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? "Creando..." : "Crear Préstamo"}
                </Button>
              </div>
            </div>
          </form>

          {simulatedSchedule && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/40 space-y-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>TEA: {(simulatedSchedule.annualEffectiveRate * 100).toFixed(2)}%</span>
                <span>Total Intereses: {simulatedSchedule.totalInterest.toFixed(2)} {currency}</span>
                <span>Costo Total: {simulatedSchedule.totalToPay.toFixed(2)} {currency}</span>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-1">#</th>
                      <th className="p-1">Vence</th>
                      <th className="p-1">Cuota</th>
                      <th className="p-1">Capital</th>
                      <th className="p-1">Interés</th>
                      <th className="p-1">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulatedSchedule.installments.map((inst) => (
                      <tr key={inst.number} className="border-b">
                        <td className="p-1">{inst.number}</td>
                        <td className="p-1">{inst.dueDate}</td>
                        <td className="p-1 font-mono">{inst.total.toFixed(2)}</td>
                        <td className="p-1 font-mono">{inst.principal.toFixed(2)}</td>
                        <td className="p-1 font-mono">{inst.interest.toFixed(2)}</td>
                        <td className="p-1 font-mono">{inst.balanceAfter.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
