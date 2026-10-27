import { AccountDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AccountsListProps {
  accounts: AccountDto[];
  loading: boolean;
  onOpenReconcileModal: (account: AccountDto) => void;
}

export function AccountsList({
  accounts,
  loading,
  onOpenReconcileModal,
}: AccountsListProps) {
  return (
    <Card className="overflow-hidden shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
        <CardTitle className="text-base font-semibold">Tus Cuentas ({accounts.length})</CardTitle>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Cargando del servidor...</span>}
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {accounts.length === 0 && !loading ? (
          <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
            <p className="text-base font-medium">No tenés cuentas creadas aún.</p>
            <p className="text-xs text-muted-foreground">
              Creá tu primera cuenta bancaria o billetera para comenzar a registrar movimientos reales.
            </p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-muted/10 transition-colors gap-3"
            >
              <div>
                <div className="font-semibold text-sm text-foreground">{acc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {acc.type} · Moneda: {acc.currency}
                </div>
              </div>
              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div
                  className={`text-base font-mono font-bold ${
                    acc.balance.isNegative() ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {acc.balance.toFixed(2)} {acc.currency}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenReconcileModal(acc)}
                  className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  ⚖️ Conciliar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
