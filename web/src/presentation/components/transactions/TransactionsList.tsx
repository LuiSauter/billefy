import { TransactionDto, AccountDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TransactionsListProps {
  transactions: TransactionDto[];
  accountsMap: Map<string, AccountDto>;
  loading: boolean;
  onReverseTxn: (txnId: string) => void;
}

export function TransactionsList({
  transactions,
  accountsMap,
  loading,
  onReverseTxn,
}: TransactionsListProps) {
  return (
    <Card className="overflow-hidden shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
        <CardTitle className="text-base font-semibold">Últimos Movimientos ({transactions.length})</CardTitle>
        <span className="text-xs text-muted-foreground">Libro Mayor Inmutable</span>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {transactions.length === 0 && !loading ? (
          <div className="py-8 px-4 text-center text-muted-foreground text-sm">
            No hay movimientos registrados todavía.
          </div>
        ) : (
          transactions.map((txn) => {
            const account = accountsMap.get(txn.accountId);
            const isIncome = txn.direction === "Income";
            const isReversal = !!txn.reversesId;

            return (
              <div
                key={txn.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center py-3 px-6 gap-2 hover:bg-muted/10 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isIncome
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                      }`}
                    >
                      {isIncome ? "Ingreso" : "Gasto"}
                    </span>
                    {isReversal && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 rounded-md font-medium">
                        Reversión
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground">{txn.description || "Sin descripción"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {account?.name || "Cuenta"} · {new Date(txn.occurredAt).toLocaleDateString()}{" "}
                    {new Date(txn.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {txn.appliedRate && ` · Tasa: ${txn.appliedRate} (${txn.rateSource})`}
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                  <span
                    className={`text-base font-mono font-bold ${
                      isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {txn.amount.toFixed(2)} {txn.currency}
                  </span>
                  {!isReversal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReverseTxn(txn.id)}
                      className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                    >
                      Revertir
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
