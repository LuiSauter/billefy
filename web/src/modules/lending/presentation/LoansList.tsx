import { Button } from "@/shared/ui/button";
import dynamic from "next/dynamic";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

const LendingOverviewChart = dynamic(
  () => import("./LendingOverviewChart").then((m) => m.LendingOverviewChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] rounded-[16px] bg-card border border-border animate-pulse" />
    ),
  }
);

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
  const preferences = useNumberPreferences();
  return (
    <div className="flex flex-col gap-5 w-full">
      {loans.length > 0 && <LendingOverviewChart loans={loans} />}

      <div className="w-full rounded-[16px] bg-card border border-border shadow-2xs overflow-hidden flex flex-col">
        <div className="flex flex-row items-center justify-between border-b border-border bg-background/60 py-4 px-6">
          <div>
            <h2 className="text-[15px] font-extrabold text-foreground">
              Préstamos y Deudas ({loans.length})
            </h2>
            <p className="text-xs text-muted-foreground">Amortización exacta, cuotas y TEA</p>
          </div>
          <Button size="sm" onClick={onOpenCreateLoanModal}>
            + Simular / Crear
          </Button>
        </div>
        <div className="p-0 divide-y divide-border">
          {loans.length === 0 && !loading ? (
            <div className="py-8 px-4 text-center text-muted-foreground text-xs">
              No tienes préstamos ni deudas registradas.
            </div>
          ) : (
            loans.map((loan) => {
              const isLent = loan.type === "Lent";
              return (
                <div
                  key={loan.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isLent
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {isLent ? "Dinero Prestado (Cobrar)" : "Deuda (Pagar)"}
                      </span>
                      <span className="font-bold text-sm text-foreground">{loan.counterpartyName}</span>
                      <span className="text-xs text-muted-foreground">
                        TEA: {formatPercent(loan.annualEffectiveRate * 100, preferences)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {loan.template} · {loan.totalInstallments} cuotas · Desembolso: {loan.disbursementDate} · Estado: {loan.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-muted-foreground">Saldo Restante</div>
                      <Amount value={loan.remainingPrincipal} currency={loan.currency} size="md" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onOpenLoanDetails(loan.id)}
                      >
                        Ver Cuotas
                      </Button>
                      {loan.status !== "Paid" && loan.status !== "Cancelled" && (
                        <Button
                          variant="success"
                          size="xs"
                          onClick={() => onOpenPaymentModal(loan.id)}
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
        </div>
      </div>
    </div>
  );
}
