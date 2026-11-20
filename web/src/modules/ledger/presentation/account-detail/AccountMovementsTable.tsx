"use client";

import React, { memo, useMemo, useState } from "react";
import Decimal from "decimal.js";
import {
  Search,
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
import { AccountsCard } from "../AccountsCard";
import {
  accountsCompactInputClassName,
  accountsCompactSelectClassName,
} from "../accounts-styles";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { cn } from "@/shared/lib/utils";
import { Amount } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { SelectField, type SelectFieldOption } from "@/shared/ui/select-field";

interface AccountMovementsTableProps {
  account: AccountDto;
  transactions: TransactionDto[];
  onEditTxn?: (txn: TransactionDto) => void;
  onReverseTxn?: (txnId: string) => void;
}

const TYPE_OPTIONS: SelectFieldOption[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "Income", label: "Ingresos" },
  { value: "Expense", label: "Gastos" },
  { value: "Transfer", label: "Transferencias" },
];

const PERIOD_OPTIONS: SelectFieldOption[] = [
  { value: "current_month", label: "Este mes" },
  { value: "last_month", label: "Mes anterior" },
  { value: "last_3_months", label: "Últimos 3 meses" },
  { value: "last_6_months", label: "Últimos 6 meses" },
  { value: "year_to_date", label: "Este año" },
  { value: "all", label: "Todos los períodos" },
];

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

interface MovementRowProps {
  txn: RunningBalanceTransaction;
  categoryName: string;
  currency: string;
  onEditTxn?: (txn: TransactionDto) => void;
  onReverseTxn?: (txnId: string) => void;
}

const MovementRow = memo(function MovementRow({
  txn,
  categoryName,
  currency,
  onEditTxn,
  onReverseTxn,
}: MovementRowProps) {
  const isTransfer = !!txn.transferId;
  const isIncome = txn.direction === "Income";

  return (
    <tr className="hover:bg-muted/40 transition group">
      {/* Fecha */}
      <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap font-medium">
        {formatDate(txn.occurredAt)}
      </td>

      {/* Descripción with Icon (+ category line while the Categoría column is hidden) */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-muted/80 border border-border flex items-center justify-center shrink-0">
            {getMovementIcon(txn)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground truncate max-w-[160px] @2xl:max-w-[200px]">
              {txn.description || "Movimiento"}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[160px] @2xl:hidden">
              {categoryName}
            </span>
          </div>
        </div>
      </td>

      {/* Categoría Pill */}
      <td className="py-3 px-3 whitespace-nowrap hidden @2xl:table-cell">
        <Badge variant="outline" className={cn("font-bold", getCategoryColor(categoryName))}>
          {categoryName}
        </Badge>
      </td>

      {/* Tipo Indicator */}
      <td className="py-3 px-3 whitespace-nowrap hidden @4xl:table-cell">
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
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <Amount
          value={isIncome ? txn.amount : new Decimal(txn.amount).negated()}
          currency={currency}
          tone={isIncome ? "income" : "expense"}
          size="sm"
        />
      </td>

      {/* Saldo Running Balance */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <Amount value={txn.runningBalance} currency={currency} size="sm" />
      </td>

      {/* 3-dots Menu */}
      <td className="py-3 pl-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 md:size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Acciones del movimiento"
                aria-label="Acciones del movimiento"
              >
                <MoreVertical />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            {onEditTxn && (
              <DropdownMenuItem onClick={() => onEditTxn(txn)}>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Editar</span>
              </DropdownMenuItem>
            )}
            {onReverseTxn && (
              <DropdownMenuItem variant="destructive" onClick={() => onReverseTxn(txn.id)}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reversar</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

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

  // Compute all running balances first
  const allRunningBalances = useMemo(() => {
    return calculateRunningBalances(account, transactions);
  }, [account, transactions]);

  // Resolve each movement's category exactly once; filtering and rendering both reuse it.
  const categoryNameByTxnId = useMemo(() => {
    const names = new Map<string, string | undefined>();
    for (const txn of allRunningBalances) {
      names.set(txn.id, txn.categoryId ? findCategory(txn.categoryId)?.name : undefined);
    }
    return names;
  }, [allRunningBalances, findCategory]);

  // Apply filters and attach the display category name
  const rows = useMemo(() => {
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
      result = result.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(q) ||
          (categoryNameByTxnId.get(t.id) || "").toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      );
    }

    return result.map((txn) => ({
      txn,
      categoryName: categoryNameByTxnId.get(txn.id) || (txn.transferId ? "Transferencia" : "General"),
    }));
  }, [allRunningBalances, categoryNameByTxnId, periodFilter, typeFilter, searchQuery]);

  return (
    <AccountsCard className="@container min-w-0">
      {/* Header with Search and Dropdowns */}
      <CardHeader className={`${appCardHeaderClassName} flex flex-col md:flex-row items-start md:items-center justify-between gap-3 space-y-0`}>
        <CardTitle className={`${appCardTitleClassName} shrink-0`}>Últimos movimientos</CardTitle>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              aria-label="Buscar movimiento"
              placeholder="Buscar movimiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={accountsCompactInputClassName}
            />
          </div>

          {/* Type Filter */}
          <SelectField
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
            options={TYPE_OPTIONS}
            wrapperClassName="w-auto"
            className={accountsCompactSelectClassName}
          />

          {/* Period Filter */}
          <SelectField
            aria-label="Filtrar por período"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterKey)}
            options={PERIOD_OPTIONS}
            wrapperClassName="w-auto"
            className={accountsCompactSelectClassName}
          />
        </div>
      </CardHeader>

      {/* Movements Table: low-priority columns hide with the card's own width; the remaining
          min-width keeps a native, touch-scrollable fallback for very narrow cards. */}
      <CardContent className={appCardContentClassName}>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-border/80 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 pr-3 font-semibold">Fecha</th>
                <th className="py-2.5 px-3 font-semibold">Descripción</th>
                <th className="py-2.5 px-3 font-semibold hidden @2xl:table-cell">Categoría</th>
                <th className="py-2.5 px-3 font-semibold hidden @4xl:table-cell">Tipo</th>
                <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                <th className="py-2.5 px-3 font-semibold text-right">Saldo</th>
                <th className="py-2.5 pl-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                    No se encontraron movimientos registrados para este período o filtro.
                  </td>
                </tr>
              ) : (
                rows.map(({ txn, categoryName }) => (
                  <MovementRow
                    key={txn.id}
                    txn={txn}
                    categoryName={categoryName}
                    currency={account.currency}
                    onEditTxn={onEditTxn}
                    onReverseTxn={onReverseTxn}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </AccountsCard>
  );
}
