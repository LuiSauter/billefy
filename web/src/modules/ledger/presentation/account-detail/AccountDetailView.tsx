"use client";

import React, { useState, useMemo } from "react";
import Decimal from "decimal.js";
import {
  BarChart3,
  ArrowLeftRight,
  CheckCircle2,
  Settings,
  Scale,
  Pencil,
} from "lucide-react";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import {
  calculateAccountPeriodStats,
  getActiveAccountTransactions,
} from "../../domain/account-detail";
import { AccountDetailHeader } from "./AccountDetailHeader";
import { AccountHeroCard } from "./AccountHeroCard";
import { AccountBalanceEvolutionChart } from "./AccountBalanceEvolutionChart";
import { AccountCashFlowDonutCard } from "./AccountCashFlowDonutCard";
import { AccountMovementsTable } from "./AccountMovementsTable";
import { AccountInfoCard } from "./AccountInfoCard";
import { AccountPeriodStatsCard } from "./AccountPeriodStatsCard";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

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
  p2pRate?: number;
}

export function AccountDetailView({
  account,
  transactions = [],
  onBack,
  onOpenReconcileModal,
  onOpenEditAccountModal,
  onOpenRegisterTxnModal,
  onEditTxn,
  onReverseTxn,
}: AccountDetailViewProps) {
  const format = useNumberFormat();
  const [activeTab, setActiveTab] = useState<AccountDetailTab>("resumen");

  const accountTxns = useMemo(() => {
    return getActiveAccountTransactions(account.id, transactions);
  }, [account.id, transactions]);

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

  const currencySymbol = account.currency === "BOB" ? "Bs" : "$";

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
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
        onOpenEdit={() => onOpenEditAccountModal(account)}
        onOpenReconcile={() => onOpenReconcileModal(account)}
      />

      {/* 3. Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "resumen"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Resumen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "movimientos"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Movimientos</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted/60 text-muted-foreground font-mono">
            {accountTxns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conciliacion")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "conciliacion"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Conciliación</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("configuracion")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "configuracion"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Charts & Movements Table */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Top Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-card border border-border/80 p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Conciliación de saldo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Alinea el saldo del sistema con el extracto bancario real.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border/70 p-4 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo actual registrado</span>
                <span className="font-bold text-foreground">
                  {currencySymbol} {format(account.balance || 0)}
                </span>
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

            <button
              type="button"
              onClick={() => onOpenReconcileModal(account)}
              className="mt-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4" />
              <span>Abrir conciliación de saldo</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border/80 p-6 flex flex-col gap-4 shadow-sm">
            <h3 className="text-base font-bold text-foreground">
              Ajustes de conciliación registrados
            </h3>
            {accountTxns.filter((t) => t.isReconciliationAdjustment).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No se registraron ajustes de conciliación para esta cuenta.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60 text-xs">
                {accountTxns
                  .filter((t) => t.isReconciliationAdjustment)
                  .map((adj) => (
                    <div key={adj.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">
                          {adj.description || "Ajuste de conciliación"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(adj.occurredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`font-black ${
                          adj.direction === "Income" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {adj.direction === "Income" ? "+ " : "- "}
                        {currencySymbol} {format(new Decimal(adj.amount).abs())}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "configuracion" && (
        <div className="rounded-2xl bg-card border border-border/80 p-6 flex flex-col gap-5 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Configuración de cuenta
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestiona los datos visuales y metadatos de tu cuenta.
              </p>
            </div>
          </div>

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
              <button
                type="button"
                onClick={() => onOpenEditAccountModal(account)}
                className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Editar</span>
              </button>
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
              <span className="font-mono font-bold text-foreground px-2 py-1 bg-muted rounded-lg">
                {account.currency}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground block">
                  Identificador de cuenta
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {account.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
