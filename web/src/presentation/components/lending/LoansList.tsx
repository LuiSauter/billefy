import { LoanSummaryDto } from "@/domain/models/types";

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
    <div className="w-full rounded-[16px] bg-white border border-border shadow-2xs overflow-hidden flex flex-col">
      <div className="flex flex-row items-center justify-between border-b border-border bg-background py-4 px-6">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground">
            Préstamos y Deudas ({loans.length})
          </h2>
          <p className="text-xs text-muted-foreground">Amortización exacta, cuotas y TEA</p>
        </div>
        <button
          onClick={onOpenCreateLoanModal}
          className="h-[34px] px-3.5 rounded-[8px] bg-primary hover:bg-blue-700 text-white text-sm font-bold transition"
        >
          + Simular / Crear
        </button>
      </div>
      <div className="p-0 divide-y divide-slate-200">
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
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-background transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isLent
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-[#6B21A8] border border-purple-200"
                      }`}
                    >
                      {isLent ? "Dinero Prestado (Cobrar)" : "Deuda (Pagar)"}
                    </span>
                    <span className="font-bold text-sm text-foreground">{loan.counterpartyName}</span>
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
                    <div className="text-xs font-semibold text-muted-foreground">Saldo Restante</div>
                    <div className="text-[15px] font-mono font-extrabold text-foreground">
                      {loan.remainingPrincipal.toFixed(2)} {loan.currency}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenLoanDetails(loan.id)}
                      className="h-[32px] px-2.5 rounded-[8px] border border-border hover:bg-slate-50 text-foreground text-xs font-semibold transition"
                    >
                      Ver Cuotas
                    </button>
                    {loan.status !== "Paid" && loan.status !== "Cancelled" && (
                      <button
                        onClick={() => onOpenPaymentModal(loan.id)}
                        className="h-[32px] px-3 rounded-[8px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition shadow-2xs"
                      >
                        Registrar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
