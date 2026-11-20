"use client";

import React, { useState, useMemo, useCallback } from "react";
import Decimal from "decimal.js";
import {
  BarChart3,
  ArrowLeftRight,
  CheckCircle2,
  Settings,
  Scale,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { IconTile } from "@/modules/dashboard/presentation/home/IconTile";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import {
  calculateAccountPeriodStats,
  getActiveAccountTransactions,
} from "../../domain/account-detail";
import { AccountsCard } from "../AccountsCard";
import { DeleteAccountConfirmation } from "../DeleteAccountConfirmation";
import { accountsPillClassName, accountsToggleVariant } from "../accounts-styles";
import { AccountDetailHeader } from "./AccountDetailHeader";
import { AccountHeroCard } from "./AccountHeroCard";
import { AccountBalanceEvolutionChart } from "./AccountBalanceEvolutionChart";
import { AccountCashFlowDonutCard } from "./AccountCashFlowDonutCard";
import { AccountMovementsTable } from "./AccountMovementsTable";
import { AccountInfoCard } from "./AccountInfoCard";
import { AccountPeriodStatsCard } from "./AccountPeriodStatsCard";
import { Amount } from "@/shared/ui/amount";

export type AccountDetailTab =
  | "resumen"
  | "movimientos"
  | "conciliacion"
  | "configuracion";

interface AccountDetailViewProps {
  account: AccountDto;
  transactions?: TransactionDto[];
  onBack: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  onOpenEditAccountModal: (account: AccountDto) => void;
  onOpenRegisterTxnModal?: (account: AccountDto) => void;
  onEditTxn?: (txn: TransactionDto) => void;
  onReverseTxn?: (txnId: string) => void;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  initialTab?: AccountDetailTab;
}

const DETAIL_TABS: { id: AccountDetailTab; label: string; icon: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "conciliacion", label: "Conciliación", icon: CheckCircle2 },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

export function AccountDetailView({
  account,
  transactions = [],
  onBack,
  onOpenReconcileModal,
  onOpenEditAccountModal,
  onOpenRegisterTxnModal,
  onEditTxn,
  onReverseTxn,
  onDeleteAccount,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  initialTab = "resumen",
}: AccountDetailViewProps) {
  const [activeTab, setActiveTab] = useState<AccountDetailTab>(initialTab);
  const [accountPendingDelete, setAccountPendingDelete] = useState<AccountDto | null>(null);

  const handleRequestDelete = useCallback(() => setAccountPendingDelete(account), [account]);
  const handleCloseDelete = useCallback(() => setAccountPendingDelete(null), []);
  const handleConfirmDelete = useCallback(
    async (accountId: string) => {
      if (!onDeleteAccount) return;
      await onDeleteAccount(accountId);
      onBack();
    },
    [onDeleteAccount, onBack]
  );

  const accountTxns = useMemo(() => {
    return getActiveAccountTransactions(account.id, transactions);
  }, [account.id, transactions]);

  const reconciliationAdjustments = useMemo(
    () => accountTxns.filter((t) => t.isReconciliationAdjustment),
    [accountTxns]
  );

  const stats = useMemo(() => {
    return calculateAccountPeriodStats(account, transactions, "all");
  }, [account, transactions]);

  // Initial balance is either provided in accountDto or derived from transactions
  const initialBalance = useMemo(() => {
    if ("initialBalance" in account && (account as unknown as { initialBalance?: number | string }).initialBalance !== undefined) {
      return new Decimal((account as unknown as { initialBalance: number | string }).initialBalance);
    }
    const current = new Decimal(account.balance || 0);
    return current.minus(stats.netVariation);
  }, [account, stats.netVariation]);

  const handleOpenRegister = () => {
    if (onOpenRegisterTxnModal) {
      onOpenRegisterTxnModal(account);
    }
  };

  return (
    <div className="@container flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. Header with Back button and Actions */}
      <AccountDetailHeader
        onBack={onBack}
        onOpenReconcile={() => onOpenReconcileModal(account)}
        onOpenEdit={() => onOpenEditAccountModal(account)}
        onOpenRegisterTxn={handleOpenRegister}
      />

      {/* 2. Hero Card with Account Summary & KPIs */}
      <AccountHeroCard
        account={account}
        initialBalance={initialBalance}
        variationPercentage={stats.percentageVariation}
        variationNominal={stats.netVariation}
        selectedCurrency={selectedCurrency}
        p2pRate={p2pRate}
        onOpenEdit={() => onOpenEditAccountModal(account)}
        onOpenReconcile={() => onOpenReconcileModal(account)}
        onDelete={onDeleteAccount ? handleRequestDelete : undefined}
      />

      {/* 3. Navigation Tabs Bar (one active-state convention: Button default = active, outline = inactive) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60">
        {DETAIL_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={accountsToggleVariant(activeTab === tab.id)}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={accountsPillClassName}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === "movimientos" && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 bg-muted/60 text-muted-foreground font-mono">
                  {accountTxns.length}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* 4. Tab Content */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Charts & Movements Table */}
          <div className="@container lg:col-span-8 flex flex-col gap-6 min-w-0">
            {/* Top Charts Row: splits by this column's own width, not the viewport */}
            <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-6">
              <AccountBalanceEvolutionChart
                account={account}
                transactions={accountTxns}
              />
              <AccountCashFlowDonutCard
                account={account}
                transactions={accountTxns}
              />
            </div>

            {/* Bottom Movements Table */}
            <AccountMovementsTable
              account={account}
              transactions={accountTxns}
              onEditTxn={onEditTxn}
              onReverseTxn={onReverseTxn}
            />
          </div>

          {/* Right Column (4 cols): Information & Period Stats Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <AccountInfoCard account={account} />
            <AccountPeriodStatsCard
              account={account}
              transactions={accountTxns}
            />
          </div>
        </div>
      )}

      {activeTab === "movimientos" && (
        <div className="flex flex-col gap-6">
          <AccountMovementsTable
            account={account}
            transactions={accountTxns}
            onEditTxn={onEditTxn}
            onReverseTxn={onReverseTxn}
          />
        </div>
      )}

      {activeTab === "conciliacion" && (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-6">
          <AccountsCard>
            <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center gap-3 space-y-0`}>
              <IconTile icon={Scale} variant="purple" size="md" />
              <div className="flex flex-col gap-1">
                <CardTitle className={appCardTitleClassName}>Conciliación de saldo</CardTitle>
                <CardDescription className="text-xs">
                  Alinea el saldo del sistema con el extracto bancario real.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className={`${appCardContentClassName} flex flex-col gap-4`}>
              <div className="rounded-xl bg-muted/40 border border-border/70 p-4 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo actual registrado</span>
                  <Amount value={account.balance || 0} currency={account.currency} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado de integridad</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Si el saldo en tu app no coincide con el de tu banco o billetera,
                podés registrar una conciliación. El sistema generará una transacción
                de ajuste sin alterar los registros históricos.
              </p>

              <Button
                type="button"
                onClick={() => onOpenReconcileModal(account)}
                className="mt-2 w-full text-xs font-bold cursor-pointer"
              >
                <Scale />
                <span>Abrir conciliación de saldo</span>
              </Button>
            </CardContent>
          </AccountsCard>

          <AccountsCard>
            <CardHeader className={appCardHeaderClassName}>
              <CardTitle className={appCardTitleClassName}>
                Ajustes de conciliación registrados
              </CardTitle>
            </CardHeader>
            <CardContent className={appCardContentClassName}>
              {reconciliationAdjustments.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No se registraron ajustes de conciliación para esta cuenta.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/60 text-xs">
                  {reconciliationAdjustments.map((adj) => (
                    <div key={adj.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">
                          {adj.description || "Ajuste de conciliación"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(adj.occurredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Amount
                        value={adj.direction === "Income" ? adj.amount : new Decimal(adj.amount).negated()}
                        currency={account.currency}
                        tone={adj.direction === "Income" ? "income" : "expense"}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </AccountsCard>
        </div>
      )}

      {activeTab === "configuracion" && (
        <AccountsCard className="max-w-2xl">
          <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center gap-3 space-y-0`}>
            <IconTile icon={Settings} variant="purple" size="md" />
            <div className="flex flex-col gap-1">
              <CardTitle className={appCardTitleClassName}>Configuración de cuenta</CardTitle>
              <CardDescription className="text-xs">
                Gestiona los datos visuales y metadatos de tu cuenta.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className={appCardContentClassName}>
            <div className="flex flex-col divide-y divide-border/60 text-xs">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-foreground block">
                    Identidad y apariencia
                  </span>
                  <span className="text-muted-foreground">
                    Modifica el nombre visible, ícono y color de acento.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenEditAccountModal(account)}
                  className="text-xs font-bold cursor-pointer"
                >
                  <Pencil className="text-muted-foreground" />
                  <span>Editar</span>
                </Button>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-foreground block">
                    Moneda base
                  </span>
                  <span className="text-muted-foreground">
                    La moneda de una cuenta es inmutable para proteger el libro contable.
                  </span>
                </div>
                <Badge variant="secondary" className="rounded-lg bg-muted font-mono font-bold text-foreground">
                  {account.currency}
                </Badge>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-foreground block">
                    Identificador de cuenta
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {account.id}
                  </span>
                </div>
              </div>

              {onDeleteAccount && (
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-destructive block">
                      Zona de peligro
                    </span>
                    <span className="text-muted-foreground">
                      Eliminar o archivar esta cuenta según tenga movimientos registrados.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRequestDelete}
                    className="text-xs font-bold cursor-pointer"
                  >
                    <Trash2 />
                    <span>Eliminar cuenta</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </AccountsCard>
      )}

      {/* Delete Confirmation Drawer (shared with the accounts list) */}
      {onDeleteAccount && (
        <DeleteAccountConfirmation
          account={accountPendingDelete}
          onConfirm={handleConfirmDelete}
          onClose={handleCloseDelete}
        />
      )}
    </div>
  );
}
