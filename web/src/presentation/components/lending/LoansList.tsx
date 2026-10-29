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
    <div className="w-full rounded-[16px] bg-white border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      <div className="flex flex-row items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] py-4 px-6">
        <div>
          <h2 className="text-[15px] font-[800] text-[#0F172A]">
            Préstamos y Deudas ({loans.length})
          </h2>
          <p className="text-[11px] text-[#64748B]">Amortización exacta, cuotas y TEA</p>
        </div>
        <button
          onClick={onOpenCreateLoanModal}
          className="h-[34px] px-3.5 rounded-[8px] bg-[#2563EB] hover:bg-blue-700 text-white text-[12px] font-[700] transition"
        >
          + Simular / Crear
        </button>
      </div>
      <div className="p-0 divide-y divide-[#E2E8F0]">
        {loans.length === 0 && !loading ? (
          <div className="py-8 px-4 text-center text-[#64748B] text-xs">
            No tienes préstamos ni deudas registradas.
          </div>
        ) : (
          loans.map((loan) => {
            const isLent = loan.type === "Lent";
            return (
              <div
                key={loan.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-[#F8FAFC] transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-[700] ${
                        isLent
                          ? "bg-blue-50 text-[#1D4ED8] border border-blue-200"
                          : "bg-purple-50 text-[#6B21A8] border border-purple-200"
                      }`}
                    >
                      {isLent ? "Dinero Prestado (Cobrar)" : "Deuda (Pagar)"}
                    </span>
                    <span className="font-[700] text-[13px] text-[#0F172A]">{loan.counterpartyName}</span>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      TEA: {(loan.annualEffectiveRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {loan.template} · {loan.totalInstallments} cuotas · Desembolso: {loan.disbursementDate} · Estado: {loan.status}
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-[#64748B]">Saldo Restante</div>
                    <div className="text-[14px] font-mono font-[800] text-[#0F172A]">
                      {loan.remainingPrincipal.toFixed(2)} {loan.currency}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenLoanDetails(loan.id)}
                      className="h-[32px] px-2.5 rounded-[8px] border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] text-[11px] font-[600] transition"
                    >
                      Ver Cuotas
                    </button>
                    {loan.status !== "Paid" && loan.status !== "Cancelled" && (
                      <button
                        onClick={() => onOpenPaymentModal(loan.id)}
                        className="h-[32px] px-3 rounded-[8px] bg-[#10B981] hover:bg-emerald-600 text-white text-[11px] font-[800] transition shadow-xs"
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
