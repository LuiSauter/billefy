import { useState } from "react";
import { DraftDto, AccountDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DraftsInboxProps {
  drafts: DraftDto[];
  accounts: AccountDto[];
  onConfirmDraft: (draft: DraftDto, selectedAccountId: string) => void;
  onDiscardDraft: (draftId: string) => void;
}

export function DraftsInbox({
  drafts,
  accounts,
  onConfirmDraft,
  onDiscardDraft,
}: DraftsInboxProps) {
  const [accountSelection, setAccountSelection] = useState<Record<string, string>>({});

  if (drafts.length === 0) return null;

  return (
    <Card className="border-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 py-3 px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <CardTitle className="text-base font-semibold text-indigo-950 dark:text-indigo-200">
            Bandeja de Entrada: Movimientos Detectados ({drafts.length})
          </CardTitle>
        </div>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
          Requiere tu confirmación (Regla 9)
        </span>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-indigo-100 dark:divide-indigo-900/30">
        {drafts.map((draft) => {
          const isIncome = draft.direction === "Income";
          const selectedAccId =
            accountSelection[draft.id] ||
            draft.suggestedAccountId ||
            accounts.find((a) => a.currency === draft.currency)?.id ||
            accounts[0]?.id ||
            "";

          return (
            <div
              key={draft.id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center py-3.5 px-6 gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isIncome
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                    }`}
                  >
                    {isIncome ? "Ingreso detectado" : "Gasto detectado"}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md">
                    {draft.source}
                  </span>
                  {draft.reference && (
                    <span className="text-xs font-mono text-muted-foreground">
                      Ref: {draft.reference}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {Math.round(draft.confidence * 100)}% confianza
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Fecha detectada: {new Date(draft.estimatedDate).toLocaleString()} · {draft.linkedEventsCount} evento(s) vinculado(s)
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <span
                  className={`text-base font-mono font-bold ${
                    isIncome
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {draft.amount.toFixed(2)} {draft.currency}
                </span>

                <div className="flex items-center gap-2">
                  {accounts.length > 0 && (
                    <select
                      value={selectedAccId}
                      onChange={(e) =>
                        setAccountSelection({ ...accountSelection, [draft.id]: e.target.value })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </select>
                  )}

                  <Button
                    size="sm"
                    onClick={() => onConfirmDraft(draft, selectedAccId)}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDiscardDraft(draft.id)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
