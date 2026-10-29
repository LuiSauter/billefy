import { FinancialHealthDto } from "@/domain/models/types";

interface HealthIndicatorsCardProps {
  health: FinancialHealthDto | null;
}

export function HealthIndicatorsCard({ health }: HealthIndicatorsCardProps) {
  if (!health) return null;

  const savingsRatePct = health.savingsRate <= 1 ? (health.savingsRate * 100).toFixed(1) : health.savingsRate.toFixed(1);

  return (
    <div className="w-full rounded-[16px] bg-white border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      <div className="py-3 px-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <h3 className="text-[14px] font-[800] text-[#0F172A]">
          📊 Indicadores de Salud Financiera (Mes en Curso)
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#64748B]">Tasa de Ahorro</div>
            <div className="text-[20px] font-[900] font-mono text-[#059669]">{savingsRatePct}%</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">del ingreso neto</div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#64748B]">Fondo de Emergencia</div>
            <div className="text-[20px] font-[900] font-mono text-[#2563EB]">{health.emergencyFundMonths.toFixed(1)} meses</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">de gastos cubiertos</div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#64748B]">Pasivos / Deudas</div>
            <div className="text-[20px] font-[900] font-mono text-[#8B5CF6]">{health.totalDebtLiabilities.toFixed(2)} BOB</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">capital adeudado</div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#64748B]">Regla 50 / 30 / 20</div>
            <div className="text-[11px] font-[700] text-[#0F172A] mt-1">
              Nec: <span className="text-[#2563EB] font-mono">{health.split503020.needsTarget.toFixed(0)}</span> | Des: <span className="text-[#D97706] font-mono">{health.split503020.wantsTarget.toFixed(0)}</span>
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">Ahorro meta: {health.split503020.savingsTarget.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
