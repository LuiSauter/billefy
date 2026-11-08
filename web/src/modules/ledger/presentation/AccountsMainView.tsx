"use client";

import React, { useState } from "react";
import { Plus, Pencil, Scale, Trash2 } from "lucide-react";
import { AccountDto } from "../domain/ledger.types";
import { AccountCard } from "./AccountCard";
import {
  classifyAccountCategory,
  formatNativeBalance,
  getAccountSubtitle,
  getCategoryBadge,
  getCurrencyConversionLabel,
} from "../domain/accounts-overview";
import { EditAccountModal } from "./EditAccountModal";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";

interface AccountsMainViewProps {
  accounts: AccountDto[];
  loading: boolean;
  viewMode: "grid" | "list";
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  onOpenCreateAccountModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  onUpdateAccount?: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  onSelectAccount?: (account: AccountDto) => void;
}

export function AccountsMainView({
  accounts,
  loading,
  viewMode,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  onOpenCreateAccountModal,
  onOpenReconcileModal,
  onUpdateAccount,
  onDeleteAccount,
  onSelectAccount,
}: AccountsMainViewProps) {
  const format = useNumberFormat();
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (acc: AccountDto) => {
    setEditingAccount(acc);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete || !onDeleteAccount) return;
    setDeleting(true);
    try {
      await onDeleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Mis cuentas
        </h2>
        <span className="text-xs text-muted-foreground font-semibold">
          {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
        </span>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-12 border border-dashed border-border rounded-2xl text-center flex flex-col items-center justify-center gap-3 bg-card/40 p-6">
          <p className="text-sm font-semibold text-foreground">
            No tenés cuentas en esta categoría.
          </p>
          <button
            type="button"
            onClick={onOpenCreateAccountModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            + Agregar cuenta
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onEdit={handleEdit}
              onReconcile={onOpenReconcileModal}
              onDelete={onDeleteAccount ? (account) => setAccountToDelete(account) : undefined}
              onSelect={onSelectAccount}
            />
          ))}

          {/* "+ Agregar cuenta" dashed card */}
          <div
            onClick={onOpenCreateAccountModal}
            className="rounded-2xl border-2 border-dashed border-border/80 hover:border-purple-500/60 bg-card/30 hover:bg-purple-950/10 p-5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition group min-h-[160px]"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground group-hover:text-purple-400 transition">
                Agregar cuenta
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Banco, wallet, cripto, inversión, etc.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl bg-card border border-border/80 overflow-hidden divide-y divide-border/60">
          {accounts.map((acc) => {
            const category = classifyAccountCategory(acc);
            const badge = getCategoryBadge(category);
            const subtitle = getAccountSubtitle(acc);
            const conversionLabel = getCurrencyConversionLabel(
              acc.balance,
              acc.currency,
              selectedCurrency,
              p2pRate,
              format
            );

            return (
              <div
                key={acc.id}
                onClick={() => (onSelectAccount ? onSelectAccount(acc) : onOpenReconcileModal(acc))}
                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {acc.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {subtitle}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-foreground border border-border/60">
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black text-foreground font-mono">
                      {formatNativeBalance(acc.balance, acc.currency, format)}
                    </div>
                    <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-end gap-1.5">
                      <span>{acc.currency}</span>
                      {conversionLabel && (
                        <>
                          <span>•</span>
                          <span>{conversionLabel}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleEdit(acc)}
                      title="Editar cuenta"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReconcileModal(acc)}
                      title="Conciliar saldo"
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteAccount && (
                      <button
                        type="button"
                        onClick={() => setAccountToDelete(acc)}
                        title="Eliminar cuenta"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div
            onClick={onOpenCreateAccountModal}
            className="p-4 flex items-center justify-center gap-2 hover:bg-purple-950/10 text-purple-400 font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar otra cuenta</span>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && onUpdateAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={onUpdateAccount}
          onDelete={onDeleteAccount}
        />
      )}

      {/* Delete Confirmation Drawer */}
      <ResponsiveDrawer
        open={!!accountToDelete}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
        title="Eliminar cuenta"
        description="Confirmación de baja de cuenta"
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAccountToDelete(null)}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleting}
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto"
            >
              Sí, eliminar cuenta
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-foreground">
            ¿Estás seguro de que querés eliminar la cuenta{" "}
            <span className="font-bold text-foreground">
              «{accountToDelete?.name}»
            </span>
            ?
          </p>
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Aviso contable:</span> Si
            la cuenta tiene transacciones registradas, será archivada para mantener
            la integridad de tu balance e historial financiero. Si no tiene
            movimientos, se eliminará permanentemente.
          </div>
        </div>
      </ResponsiveDrawer>
    </div>
  );
}
