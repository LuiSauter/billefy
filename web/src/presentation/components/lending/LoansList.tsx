import { LoanSummaryDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoansListProps {
  loans: LoanSummaryDto[];
  loading: boolean;
  onOpenCreateLoanModal: () => void;
  onOpenLoanDetails: (loanId: string) => void;
  onOpenPaymentModal: (loanId: string) => void;
}

export function LoansList({
  loans,
  loading,
  onOpenCreateLoanModal,
  onOpenLoanDetails,
  onOpenPaymentModal,
}: LoansListProps) {
  return (
    <Card className="overflow-hidden shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-amber-50/40 dark:bg-amber-950/20 py-3 px-6">
        <div>
          <CardTitle className="text-base font-semibold text-amber-950 dark:text-amber-200">
            Préstamos y Deudas ({loans.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">Amortización exacta, cuotas y TEA</p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenCreateLoanModal} className="text-xs h-7">
          + Simular / Crear
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {loans.length === 0 && !loading ? (
          <div className="py-8 px-4 text-center text-muted-foreground text-sm">
            No tienes préstamos ni deudas registradas.
          </div>
        ) : (
          loans.map((loan) => {
            const isLent = loan.type === "Lent";
            return (
              <div
                key={loan.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-muted/10 transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isLent
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      }`}
                    >
                      {isLent ? "Dinero Prestado (Cobrar)" : "Deuda (Pagar)"}
                    </span>
                    <span className="font-semibold text-sm text-foreground">{loan.counterpartyName}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      TEA: {(loan.annualEffectiveRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {loan.template} · {loan.totalInstallments} cuotas · Desembolso: {loan.disbursementDate} · Estado: {loan.status}
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Saldo Restante</div>
                    <div className="text-base font-mono font-bold text-foreground">
                      {loan.remainingPrincipal.toFixed(2)} {loan.currency}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenLoanDetails(loan.id)}
                      className="text-xs h-8 px-2.5"
                    >
                      Ver Cuotas
                    </Button>
                    {loan.status !== "Paid" && loan.status !== "Cancelled" && (
                      <Button
                        size="sm"
                        onClick={() => onOpenPaymentModal(loan.id)}
                        className="text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Registrar Pago
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
