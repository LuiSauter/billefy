import { Button } from "@/components/ui/button";

interface ActionToolbarProps {
  hasAccounts: boolean;
  onOpenAccountModal: () => void;
  onOpenTxnModal: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenBinanceModal: () => void;
  onOpenDistributeModal: () => void;
  onOpenLoanModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenGoalModal: () => void;
  onOpenCsvModal: () => void;
  onOpenSimulateModal: () => void;
}

export function ActionToolbar({
  hasAccounts,
  onOpenAccountModal,
  onOpenTxnModal,
  onOpenWhatsAppModal,
  onOpenBinanceModal,
  onOpenDistributeModal,
  onOpenLoanModal,
  onOpenBudgetModal,
  onOpenGoalModal,
  onOpenCsvModal,
  onOpenSimulateModal,
}: ActionToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={onOpenAccountModal} className="gap-2">
        + Nueva Cuenta
      </Button>
      <Button
        onClick={onOpenTxnModal}
        disabled={!hasAccounts}
        variant="secondary"
        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        + Registrar Movimiento
      </Button>
      <Button
        onClick={onOpenWhatsAppModal}
        variant="outline"
        className="gap-2 border-green-300 text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-300"
      >
        💬 Bot WhatsApp
      </Button>
      <Button
        onClick={onOpenBinanceModal}
        variant="outline"
        className="gap-2 border-yellow-400 text-yellow-800 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300"
      >
        🟡 Binance Read-Only
      </Button>
      <Button
        onClick={onOpenDistributeModal}
        variant="outline"
        className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
      >
        💡 Distribuir Ingreso
      </Button>
      <Button
        onClick={onOpenLoanModal}
        variant="outline"
        className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
      >
        🤝 Préstamo / Simular
      </Button>
      <Button onClick={onOpenBudgetModal} variant="outline" className="gap-2">
        🎯 Presupuesto
      </Button>
      <Button onClick={onOpenGoalModal} variant="outline" className="gap-2">
        🏆 Meta
      </Button>
      <Button onClick={onOpenCsvModal} disabled={!hasAccounts} variant="outline" className="gap-2">
        📁 Importar Extracto
      </Button>
      <Button
        onClick={onOpenSimulateModal}
        variant="outline"
        className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        ⚡ Simular Notificación
      </Button>
    </div>
  );
}
