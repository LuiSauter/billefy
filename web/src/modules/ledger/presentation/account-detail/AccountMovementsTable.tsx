"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Decimal from "decimal.js";
import {
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  RotateCcw,
  Briefcase,
  ShoppingCart,
  Utensils,
  Zap,
  Tag,
} from "lucide-react";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import {
  calculateRunningBalances,
  filterTransactionsByPeriod,
  filterTransactionsByType,
  PeriodFilterKey,
  RunningBalanceTransaction,
  TransactionTypeFilter,
} from "../../domain/account-detail";
import { useUserCategories } from "../../application/CategoriesContext";
import { Amount } from "@/shared/ui/amount";

interface AccountMovementsTableProps {
  account: AccountDto;
  transactions: TransactionDto[];
  onEditTxn?: (txn: TransactionDto) => void;
  onReverseTxn?: (txnId: string) => void;
}

export function AccountMovementsTable({
  account,
  transactions,
  onEditTxn,
  onReverseTxn,
}: AccountMovementsTableProps) {
  const { findCategory } = useUserCategories();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterKey>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  // Compute all running balances first
  const allRunningBalances = useMemo(() => {
    return calculateRunningBalances(account, transactions);
  }, [account, transactions]);

  // Apply filters
  const filteredMovements = useMemo(() => {
    let result = allRunningBalances;

    // Filter by period
    if (periodFilter !== "all") {
      result = filterTransactionsByPeriod(result, periodFilter) as RunningBalanceTransaction[];
    }

    // Filter by type
    if (typeFilter !== "all") {
      result = filterTransactionsByType(result, typeFilter) as RunningBalanceTransaction[];
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const cat = t.categoryId ? findCategory(t.categoryId) : undefined;
        return (
          (t.description || "").toLowerCase().includes(q) ||
          (cat?.name || "").toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        );
      });
    }

    return result;
  }, [allRunningBalances, periodFilter, typeFilter, searchQuery, findCategory]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getMovementIcon = (txn: TransactionDto) => {
    const desc = (txn.description || "").toLowerCase();
    if (txn.transferId) {
      return <ArrowLeftRight className="w-4 h-4 text-cyan-400" />;
    }
    if (desc.includes("salario") || desc.includes("sueldo") || desc.includes("ingreso")) {
      return <Briefcase className="w-4 h-4 text-emerald-400" />;
    }
    if (desc.includes("super") || desc.includes("mercado") || desc.includes("compras")) {
      return <ShoppingCart className="w-4 h-4 text-purple-400" />;
    }
    if (desc.includes("restaurante") || desc.includes("comida") || desc.includes("cena")) {
      return <Utensils className="w-4 h-4 text-indigo-400" />;
    }
    if (desc.includes("luz") || desc.includes("agua") || desc.includes("servicio") || desc.includes("internet")) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    return <Tag className="w-4 h-4 text-muted-foreground" />;
  };

  const getCategoryColor = (catName?: string) => {
    if (!catName) return "bg-muted/80 text-muted-foreground border-border";
    const lower = catName.toLowerCase();
    if (lower.includes("ingreso") || lower.includes("salario")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (lower.includes("alimento") || lower.includes("super")) {
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    }
    if (lower.includes("transfer") || lower.includes("cambio")) {
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
    if (lower.includes("comida") || lower.includes("restaurant")) {
      return "bg-pink-500/15 text-pink-300 border-pink-500/30";
    }
    if (lower.includes("servicio") || lower.includes("luz") || lower.includes("agua")) {
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
    return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 flex flex-col gap-4 shadow-sm min-w-0">
      {/* Header with Search and Dropdowns */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground tracking-tight shrink-0">
          Últimos movimientos
        </h3>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar movimiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/60 hover:bg-muted focus:bg-background border border-border focus:border-purple-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
              className="appearance-none bg-muted/60 hover:bg-muted border border-border text-foreground text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 transition cursor-pointer outline-none focus:border-purple-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="Income">Ingresos</option>
              <option value="Expense">Gastos</option>
              <option value="Transfer">Transferencias</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Period Filter */}
          <div className="relative">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterKey)}
              className="appearance-none bg-muted/60 hover:bg-muted border border-border text-foreground text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 transition cursor-pointer outline-none focus:border-purple-500"
            >
              <option value="current_month">Este mes</option>
              <option value="last_month">Mes anterior</option>
              <option value="last_3_months">Últimos 3 meses</option>
              <option value="last_6_months">Últimos 6 meses</option>
              <option value="year_to_date">Este año</option>
              <option value="all">Todos los períodos</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-2.5 pr-4 font-semibold">Fecha</th>
              <th className="py-2.5 px-4 font-semibold">Descripción</th>
              <th className="py-2.5 px-4 font-semibold">Categoría</th>
              <th className="py-2.5 px-4 font-semibold">Tipo</th>
              <th className="py-2.5 px-4 font-semibold text-right">Monto</th>
              <th className="py-2.5 px-4 font-semibold text-right">Saldo</th>
              <th className="py-2.5 pl-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-xs">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  No se encontraron movimientos registrados para este período o filtro.
                </td>
              </tr>
            ) : (
              filteredMovements.map((txn) => {
                const category = txn.categoryId ? findCategory(txn.categoryId) : undefined;
                const categoryName = category?.name || (txn.transferId ? "Transferencia" : "General");
                const isTransfer = !!txn.transferId;
                const isIncome = txn.direction === "Income";

                return (
                  <tr
                    key={txn.id}
                    className="hover:bg-muted/40 transition group"
                  >
                    {/* Fecha */}
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap font-medium">
                      {formatDate(txn.occurredAt)}
                    </td>

                    {/* Descripción with Icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-muted/80 border border-border flex items-center justify-center shrink-0">
                          {getMovementIcon(txn)}
                        </div>
                        <span className="font-bold text-foreground truncate max-w-[200px]">
                          {txn.description || "Movimiento"}
                        </span>
                      </div>
                    </td>

                    {/* Categoría Pill */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryColor(
                          categoryName
                        )}`}
                      >
                        {categoryName}
                      </span>
                    </td>

                    {/* Tipo Indicator */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold text-xs">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Transferencia</span>
                        </span>
                      ) : isIncome ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Ingreso</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-xs">
                          <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Gasto</span>
                        </span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Amount
                        value={isIncome ? txn.amount : new Decimal(txn.amount).negated()}
                        currency={account.currency}
                        tone={isIncome ? "income" : "expense"}
                        size="sm"
                      />
                    </td>

                    {/* Saldo Running Balance */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Amount value={txn.runningBalance} currency={account.currency} size="sm" />
                    </td>

                    {/* 3-dots Menu */}
                    <td className="py-3 pl-4 text-right relative">
                      <div className="relative inline-block" ref={activeMenuId === txn.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === txn.id ? null : txn.id)
                          }
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                          title="Acciones del movimiento"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === txn.id && (
                          <div className="absolute right-0 top-8 w-40 rounded-xl bg-popover border border-border shadow-xl py-1 z-30 flex flex-col text-xs font-semibold">
                            {onEditTxn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditTxn(txn);
                                }}
                                className="px-3 py-2 text-left text-foreground hover:bg-muted flex items-center gap-2 transition"
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Editar</span>
                              </button>
                            )}
                            {onReverseTxn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onReverseTxn(txn.id);
                                }}
                                className="px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                                <span>Reversar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
