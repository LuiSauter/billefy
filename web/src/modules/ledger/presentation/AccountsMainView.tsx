"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { Plus, Pencil, Scale, Trash2 } from "lucide-react";
import { AccountDto } from "../domain/ledger.types";
import { AccountCard } from "./AccountCard";
import { AccountsCard } from "./AccountsCard";
import { DeleteAccountConfirmation } from "./DeleteAccountConfirmation";
import { accountsSectionTitleClassName } from "./accounts-styles";
import {
  classifyAccountCategory,
  getAccountSubtitle,
  getCategoryBadge,
  getCurrencyConversionLabel,
} from "../domain/accounts-overview";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Amount } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface AccountsMainViewProps {
  accounts: AccountDto[];
  loading: boolean;
  viewMode: "grid" | "list";
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  onOpenCreateAccountModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  /** Opens the edit modal, which is owned by AccountsTabView (single owner). */
  onEditAccount?: (account: AccountDto) => void;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  onSelectAccount?: (account: AccountDto) => void;
}

interface AccountListRowData {
  account: AccountDto;
  badgeLabel: string;
  subtitle: string;
  conversionLabel: string | null;
}

interface AccountListRowProps {
  row: AccountListRowData;
  canDelete: boolean;
  onSelect: (account: AccountDto) => void;
  onEdit: (account: AccountDto) => void;
  onReconcile: (account: AccountDto) => void;
  onRequestDelete: (account: AccountDto) => void;
}

const AccountListRow = memo(function AccountListRow({
  row,
  canDelete,
  onSelect,
  onEdit,
  onReconcile,
  onRequestDelete,
}: AccountListRowProps) {
  const { account, badgeLabel, subtitle, conversionLabel } = row;

  return (
    <div
      onClick={() => onSelect(account)}
      className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition cursor-pointer group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{account.name}</div>
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        </div>
      </div>

      <div className="hidden sm:block">
        <Badge variant="outline" className="rounded-lg bg-muted/60 border-border/60">
          {badgeLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <Amount value={account.balance} currency={account.currency} size="sm" className="min-w-0 truncate" />
          <div className="text-xs font-bold text-muted-foreground flex items-center justify-end gap-1.5">
            <span>{account.currency}</span>
            {conversionLabel && (
              <>
                <span>•</span>
                <span>{conversionLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(account)}
            title="Editar cuenta"
            aria-label="Editar cuenta"
            className="size-8 md:size-8 text-muted-foreground hover:text-foreground"
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onReconcile(account)}
            title="Conciliar saldo"
            aria-label="Conciliar saldo"
            className="size-8 md:size-8 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Scale />
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onRequestDelete(account)}
              title="Eliminar cuenta"
              aria-label="Eliminar cuenta"
              className="size-8 md:size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export function AccountsMainView({
  accounts,
  loading,
  viewMode,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  onOpenCreateAccountModal,
  onOpenReconcileModal,
  onEditAccount,
  onDeleteAccount,
  onSelectAccount,
}: AccountsMainViewProps) {
  const format = useNumberFormat();
  const [accountToDelete, setAccountToDelete] = useState<AccountDto | null>(null);

  const handleEdit = useCallback(
    (acc: AccountDto) => {
      onEditAccount?.(acc);
    },
    [onEditAccount]
  );
  const handleRequestDelete = useCallback((acc: AccountDto) => setAccountToDelete(acc), []);
  const handleCloseDelete = useCallback(() => setAccountToDelete(null), []);
  const handleRowSelect = useCallback(
    (acc: AccountDto) => (onSelectAccount ? onSelectAccount(acc) : onOpenReconcileModal(acc)),
    [onSelectAccount, onOpenReconcileModal]
  );

  // Per-row derived data is only needed by the list view; compute it once per input change.
  const listRows = useMemo<AccountListRowData[]>(() => {
    if (viewMode !== "list") return [];
    return accounts.map((account) => ({
      account,
      badgeLabel: getCategoryBadge(classifyAccountCategory(account)).label,
      subtitle: getAccountSubtitle(account),
      conversionLabel: getCurrencyConversionLabel(
        account.balance,
        account.currency,
        selectedCurrency,
        p2pRate,
        format
      ),
    }));
  }, [viewMode, accounts, selectedCurrency, p2pRate, format]);

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className={accountsSectionTitleClassName}>Mis cuentas</h2>
        <span className="text-xs text-muted-foreground font-semibold">
          {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
        </span>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <AccountsCard className="py-12 border-dashed border-border bg-card/40 text-center flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm font-semibold text-foreground">
            No tenés cuentas en esta categoría.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onOpenCreateAccountModal}
            className="rounded-xl text-xs font-bold cursor-pointer"
          >
            + Agregar cuenta
          </Button>
        </AccountsCard>
      ) : viewMode === "grid" ? (
        // Container queries: this grid lives in a lg:col-span-7/xl:col-span-8 column, so its
        // column count must follow the column's own width, not the viewport.
        <div className="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-3.5">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onEdit={handleEdit}
              onReconcile={onOpenReconcileModal}
              onDelete={onDeleteAccount ? handleRequestDelete : undefined}
              onSelect={onSelectAccount}
            />
          ))}

          {/* "+ Agregar cuenta" dashed card */}
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenCreateAccountModal}
            className="group h-auto min-h-[160px] flex-col gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-card/30 p-4 text-center whitespace-normal cursor-pointer hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
          >
            <span className="w-8 h-8 rounded-full bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </span>
            <span className="flex flex-col items-center">
              <span className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Agregar cuenta
              </span>
              <span className="text-xs font-normal text-muted-foreground mt-0.5">
                Banco, wallet, cripto, inversión, etc.
              </span>
            </span>
          </Button>
        </div>
      ) : (
        /* List View */
        <AccountsCard className="overflow-hidden divide-y divide-border/60">
          {listRows.map((row) => (
            <AccountListRow
              key={row.account.id}
              row={row}
              canDelete={!!onDeleteAccount}
              onSelect={handleRowSelect}
              onEdit={handleEdit}
              onReconcile={onOpenReconcileModal}
              onRequestDelete={handleRequestDelete}
            />
          ))}

          <Button
            type="button"
            variant="ghost"
            onClick={onOpenCreateAccountModal}
            className="h-auto w-full rounded-none p-4 gap-2 text-primary font-bold text-xs hover:bg-primary/5 hover:text-primary cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar otra cuenta</span>
          </Button>
        </AccountsCard>
      )}

      {onDeleteAccount && (
        <DeleteAccountConfirmation
          account={accountToDelete}
          onConfirm={onDeleteAccount}
          onClose={handleCloseDelete}
        />
      )}
    </div>
  );
}
