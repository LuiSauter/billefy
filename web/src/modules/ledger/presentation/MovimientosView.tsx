"use client";

import React, { useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowLeftRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  Landmark,
  MoreVertical,
  Plus,
  Search,
  Square,
  Tag,
  TrendingUp,
} from "lucide-react";
import { AccountDto, TransactionDto } from "../domain/ledger.types";
import { MovementKind } from "../domain/movement";
import { useMovements } from "../application/useMovements";
import { MovementActions } from "./MovementActions";
import { FxTransferModal } from "./FxTransferModal";
import { useUserCategories } from "../application/CategoriesContext";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { InvestmentsController } from "@/modules/investments/application/useInvestments";
import { InvestmentCashModal } from "@/modules/investments/presentation/InvestmentCashModal";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { MonthPicker } from "@/shared/ui/month-picker";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { formatCurrencyLabel } from "@/shared/lib/currency";
import { Amount } from "@/shared/ui/amount";

export interface MovimientosViewProps {
  http: IHttpClient | null;
  accounts: AccountDto[];
  onRegister: () => void;
  onRefresh?: () => Promise<void>;
  investmentsController: InvestmentsController;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  onExecuteFxTransfer: (command: {
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    description: string;
    p2pRate: number;
  }) => Promise<void>;
  onEditTxn?: (transaction: TransactionDto) => void;
}

function toTargetCurrency(
  amount: Decimal | string | number,
  sourceCurrency: string,
  targetCurrency: "BOB" | "USD",
  p2pRate: number
): Decimal {
  const dec = new Decimal(amount || 0);
  const rate = new Decimal(p2pRate > 0 ? p2pRate : 9.85);
  const src = (sourceCurrency || targetCurrency).toUpperCase();
  const tgt = targetCurrency.toUpperCase();

  if (src === tgt || (src === "USDT" && tgt === "USD")) {
    return dec;
  }
  if (src === "BOB" && tgt === "USD") {
    return dec.div(rate);
  }
  if ((src === "USD" || src === "USDT") && tgt === "BOB") {
    return dec.times(rate);
  }
  return dec;
}

const kindLabel = (kind: MovementKind, investmentCashKind?: string) =>
  kind === "Income"
    ? "Ingreso"
    : kind === "Expense"
    ? "Gasto"
    : kind === "Transfer"
    ? "Transferencia"
    : kind === "Adjustment"
    ? "Ajuste de conciliación"
    : investmentCashKind === "Contribution"
    ? "Aporte de inversión"
    : "Retiro de inversión";

const dateLabel = (value: string) => {
  const d = new Date(value);
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateTimeLabel = (value: string) => {
  const d = new Date(value);
  return d.toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const movementIcon = (kind: MovementKind) =>
  kind === "Income"
    ? ArrowDown
    : kind === "Expense"
    ? ArrowUp
    : kind === "Transfer"
    ? ArrowLeftRight
    : kind === "Adjustment"
    ? Landmark
    : TrendingUp;

export function MovimientosView({
  http,
  accounts,
  onRegister,
  onRefresh,
  investmentsController,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  onExecuteFxTransfer,
  onEditTxn,
}: MovimientosViewProps) {
  const { categories } = useUserCategories();
  const numberPreferences = useNumberPreferences();
  const formatNumber = useNumberFormat();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<MovementKind | "">("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"Active" | "Audit">("Active");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const query = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return {
      startUtc: new Date(y, m - 1, 1).toISOString(),
      endUtcExclusive: new Date(y, m, 1).toISOString(),
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      type: type || undefined,
      search: search || undefined,
      mode,
      page,
      pageSize: 10,
    };
  }, [month, accountId, categoryId, type, search, mode, page]);

  const { data, loading, error, reload } = useMovements(http, query);
  const movements = data?.items || [];
  const selected = movements.find((m) => m.id === selectedId) || movements[0];

  const change = (fn: () => void) => {
    fn();
    setPage(1);
    setSelectedId("");
  };

  const totalCount = data?.totalCount || 0;
  const pages = Math.max(1, Math.ceil(totalCount / 10));

  useEffect(() => {
    if (!loading && movements.length === 0 && page > pages) {
      setPage(pages);
      setSelectedId("");
    }
  }, [loading, movements.length, page, pages]);

  const refreshAfterWrite = async () => {
    try {
      await onRefresh?.();
      setRefreshError("");
    } catch {
      setRefreshError(
        "El cambio se guardó, pero no se pudo actualizar el resumen de cuentas. No lo vuelvas a enviar; actualiza los datos."
      );
    } finally {
      reload();
    }
  };

  const refreshAfterInvestmentWrite = async () => {
    await refreshAfterWrite();
    try {
      await investmentsController.refreshAfterCash();
    } catch {
      setRefreshError(
        "El efectivo de inversión se guardó o revirtió, pero no se pudo actualizar la lista de inversiones. No lo vuelvas a enviar; recarga la página."
      );
    }
  };

  const summaries = useMemo(() => data?.summary || [], [data?.summary]);

  const monthDisplayLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    const label = d.toLocaleDateString("es-BO", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month]);

  // Aggregated totals converted to the single selected currency (BOB or USD)
  const kpiTotals = useMemo(() => {
    let income = new Decimal(0);
    let expenses = new Decimal(0);
    let transfers = new Decimal(0);
    let investments = new Decimal(0);

    for (const s of summaries) {
      income = income.plus(
        toTargetCurrency(s.income, s.currency, selectedCurrency, p2pRate)
      );
      expenses = expenses.plus(
        toTargetCurrency(s.expenses, s.currency, selectedCurrency, p2pRate)
      );
      transfers = transfers.plus(
        toTargetCurrency(s.transferOut, s.currency, selectedCurrency, p2pRate)
      );
      investments = investments.plus(
        toTargetCurrency(s.contributions, s.currency, selectedCurrency, p2pRate)
      );
    }

    return { income, expenses, transfers, investments };
  }, [summaries, selectedCurrency, p2pRate]);

  const kpiCards = [
    {
      title: "Ingresos del mes",
      amount: kpiTotals.income,
      icon: ArrowDown,
      badge: undefined,
      badgeVariant: "success" as const,
      iconBg: "bg-emerald-500/15 text-emerald-400",
    },
    {
      title: "Gastos del mes",
      amount: kpiTotals.expenses,
      icon: ArrowUp,
      badge: undefined,
      badgeVariant: "expense" as const,
      iconBg: "bg-rose-500/15 text-rose-400",
    },
    {
      title: "Transferencias",
      amount: kpiTotals.transfers,
      icon: ArrowLeftRight,
      badge: undefined,
      badgeVariant: "transfer" as const,
      iconBg: "bg-violet-500/15 text-violet-400",
    },
    {
      title: "Inversiones",
      amount: kpiTotals.investments,
      icon: BarChart3,
      badge: undefined,
      badgeVariant: "investment" as const,
      iconBg: "bg-sky-500/15 text-sky-400",
    },
  ];

  const paginationItems: Array<number | "ellipsis"> =
    pages <= 5
      ? Array.from({ length: pages }, (_, i) => i + 1)
      : page <= 3
      ? [1, 2, 3, "ellipsis", pages]
      : page >= pages - 2
      ? [1, "ellipsis", pages - 2, pages - 1, pages]
      : [1, "ellipsis", page, "ellipsis", pages];

  const SelectedIcon = selected ? movementIcon(selected.kind) : ArrowLeftRight;

  return (
    <div className="space-y-6 text-foreground">
      {/* 1. Header with Title, Description, and Action */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Transacciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona y analiza todas tus transacciones de ingresos, gastos, transferencias e inversiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="h-10 rounded-xl border-violet-500/40 px-4 font-semibold text-violet-200 hover:bg-violet-500/10"
          >
            <ArrowLeftRight className="size-4" aria-hidden="true" />
            <span>Transferencia</span>
          </Button>
          <Button
            onClick={onRegister}
            className="h-10 rounded-xl bg-[#7c3aed] px-5 font-semibold text-white shadow-lg shadow-purple-950/40 hover:bg-[#6d28d9] active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Registrar transacción</span>
          </Button>

          <details className="relative">
            <summary
              className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Más opciones de registro"
            >
              <span>Opciones</span>
              <span aria-hidden="true" className="text-xs">
                ▼
              </span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-1 rounded-xl border border-border bg-card p-2 shadow-2xl">
              <button
                type="button"
                onClick={() => setCashOpen(true)}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"
              >
                Aporte o retiro de inversión
              </button>
            </div>
          </details>
        </div>
      </header>

      {/* 2. Four Semantic KPI Cards in Single Selected Currency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(
          ({ title, amount, icon: Icon, badge, badgeVariant, iconBg }) => (
            <Card
              key={title}
              data-kpi-card="true"
              className="border-border/80 bg-card/90 shadow-sm"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${iconBg}`}
                >
                  <Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {title}
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    {summaries.length > 0 ? (
                      <Amount value={amount} currency={selectedCurrency} size="lg" className="text-white" />
                    ) : (
                      <span className="text-md font-bold tracking-tight text-white lg:text-lg">—</span>
                    )}
                    {badge && summaries.length > 0 && (
                      <Badge
                        variant={badgeVariant}
                        className="rounded-full px-2 py-0 text-[11px] font-semibold"
                      >
                        {badge}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* 3. Filters Row */}
      <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-border/80 bg-card/80 p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {/* Month calendar popover using shadcn Popover & Calendar */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            aria-label="Mes"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-medium shadow-2xs outline-none transition hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <span className="flex items-center gap-2 truncate">
              <CalendarDays
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{monthDisplayLabel}</span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 bg-card border-border">
            <MonthPicker
              value={month}
              onChange={(val) => {
                change(() => setMonth(val));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        {/* Account select */}
        <NativeSelect
          aria-label="Cuenta"
          value={accountId}
          onChange={(e) => change(() => setAccountId(e.target.value))}
        >
          <NativeSelectOption value="">Todas las cuentas</NativeSelectOption>
          {accounts.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Category select */}
        <NativeSelect
          aria-label="Categoría"
          value={categoryId}
          onChange={(e) => change(() => setCategoryId(e.target.value))}
        >
          <NativeSelectOption value="">Todas las categorías</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {/* Type select */}
        <NativeSelect
          aria-label="Tipo"
          value={type}
          onChange={(e) => change(() => setType(e.target.value as MovementKind | ""))}
        >
          <NativeSelectOption value="">Todos los tipos</NativeSelectOption>
          <NativeSelectOption value="Income">Ingreso</NativeSelectOption>
          <NativeSelectOption value="Expense">Gasto</NativeSelectOption>
          <NativeSelectOption value="Transfer">Transferencia</NativeSelectOption>
          <NativeSelectOption value="Investment">Inversión</NativeSelectOption>
          <NativeSelectOption value="Adjustment">Ajuste de conciliación</NativeSelectOption>
        </NativeSelect>

        {/* Search Input */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Buscar transacción"
            placeholder="Buscar transacción..."
            value={search}
            onChange={(e) => change(() => setSearch(e.target.value))}
            className="h-10 pl-9 pr-3 text-sm font-medium"
          />
        </div>

        {/* Mode switcher (Activos / Historial) */}
        <Button
          variant="outline"
          aria-pressed={mode === "Audit"}
          onClick={() =>
            change(() => setMode(mode === "Active" ? "Audit" : "Active"))
          }
          className="h-10 rounded-xl px-4 text-xs font-semibold aria-pressed:bg-primary/15 aria-pressed:text-primary"
        >
          {mode === "Active" ? "Activos" : "Historial"}
        </Button>
      </div>

      {refreshError && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300"
        >
          {refreshError}
          <button
            onClick={refreshAfterWrite}
            className="ml-3 font-semibold underline"
          >
            Actualizar
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          {error}
          <button onClick={reload} className="ml-3 font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {/* 4. Table + Detail Aside Grid */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left Column: Movement Table */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/80 hover:bg-transparent">
                <TableHead className="w-10 px-3 text-center">
                  <Square className="mx-auto size-4 text-muted-foreground/60" />
                </TableHead>
                <TableHead className="w-28 font-medium">
                  <span className="flex items-center gap-1">
                    Fecha <ArrowDownUp className="size-3 text-muted-foreground" />
                  </span>
                </TableHead>
                <TableHead className="font-medium">Descripción</TableHead>
                <TableHead className="font-medium">Categoría</TableHead>
                <TableHead className="font-medium">Cuenta</TableHead>
                <TableHead className="font-medium">Tipo</TableHead>
                <TableHead className="text-right font-medium">Monto</TableHead>
                <TableHead className="w-10 px-2 text-center" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {movements.map((m) => {
                const Icon = movementIcon(m.kind);
                const isSelected = selected?.id === m.id;
                const convertedAmount = toTargetCurrency(
                  m.amount,
                  m.currency,
                  selectedCurrency,
                  p2pRate
                );
                const isIncome = m.direction === "Income";

                return (
                  <TableRow
                    key={m.id}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(m.id);
                      }
                    }}
                    className={`cursor-pointer border-border/70 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none ${
                      isSelected ? "bg-primary/10 hover:bg-primary/15" : ""
                    }`}
                  >
                    {/* Checkbox column */}
                    <TableCell className="px-3 text-center">
                      {isSelected ? (
                        <CheckSquare className="mx-auto size-4 text-primary" />
                      ) : (
                        <Square className="mx-auto size-4 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </TableCell>

                    {/* Fecha */}
                    <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                      {dateLabel(m.occurredAt)}
                    </TableCell>

                    {/* Descripción with colored circular icon */}
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                            m.kind === "Income"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : m.kind === "Expense"
                              ? "bg-amber-500/15 text-amber-400"
                              : m.kind === "Transfer"
                              ? "bg-violet-500/15 text-violet-400"
                              : "bg-sky-500/15 text-sky-400"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="truncate font-medium text-foreground">
                          {m.description || "Sin descripción"}
                          {m.isReversal && (
                            <span className="ml-1.5 text-xs text-amber-400">
                              (Reversión)
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>

                    {/* Categoría pill */}
                    <TableCell>
                      <Badge
                        variant="purple"
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {m.categoryName || "Sin categoría"}
                      </Badge>
                    </TableCell>

                    {/* Cuenta */}
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Landmark
                          className="size-4 text-blue-400"
                          aria-hidden="true"
                        />
                        {m.accountName}
                      </span>
                    </TableCell>

                    {/* Tipo pill */}
                    <TableCell>
                      <Badge
                        variant={
                          m.kind === "Income"
                            ? "success"
                            : m.kind === "Expense"
                            ? "expense"
                            : m.kind === "Transfer"
                            ? "transfer"
                            : m.kind === "Adjustment"
                            ? "default"
                            : "investment"
                        }
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      >
                        {kindLabel(m.kind, m.investmentCashKind)}
                      </Badge>
                    </TableCell>

                    {/* Monto in Single Selected Currency */}
                    <TableCell className="whitespace-nowrap text-right">
                      <Amount
                        value={isIncome ? convertedAmount : convertedAmount.negated()}
                        currency={selectedCurrency}
                        sign={isIncome ? "always" : "auto"}
                        size="sm"
                        tone={isIncome ? "income" : "expense"}
                      />
                    </TableCell>

                    {/* Kebab menu button */}
                    <TableCell className="px-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Acciones de movimiento"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(m.id);
                        }}
                      >
                        <MoreVertical className="size-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Footer with Numbered Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-5 py-3 text-sm text-muted-foreground">
            <span>
              {loading
                ? "Cargando…"
                : totalCount
                ? `Mostrando ${((page - 1) * 10) + 1}–${Math.min(
                    ((page - 1) * 10) + movements.length,
                    totalCount
                  )} de ${totalCount} transacciones`
                : "Mostrando 0 de 0 transacciones"}
            </span>

            <nav
              aria-label="Paginación de movimientos"
              className="flex items-center gap-1"
            >
              <Button
                variant="outline"
                size="icon-xs"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  setSelectedId("");
                }}
                aria-label="Página anterior"
                className="size-8 rounded-lg"
              >
                ‹
              </Button>

              {paginationItems.map((item, i) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${i}`} aria-hidden="true" className="px-1 text-xs">
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? "default" : "outline"}
                    size="icon-xs"
                    aria-label={`Ir a página ${item}`}
                    aria-current={page === item ? "page" : undefined}
                    onClick={() => {
                      setPage(item);
                      setSelectedId("");
                    }}
                    className={`size-8 rounded-lg text-xs font-semibold ${
                      page === item
                        ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                        : "border-border/80 hover:bg-muted"
                    }`}
                  >
                    {item}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon-xs"
                disabled={page >= pages}
                onClick={() => {
                  setPage(page + 1);
                  setSelectedId("");
                }}
                aria-label="Página siguiente"
                className="size-8 rounded-lg"
              >
                ›
              </Button>
            </nav>
          </div>
        </div>

        {/* Right Column: Detalle de la transacción */}
        <aside
          aria-label="Detalle de la transacción"
          className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-foreground">
            Detalle de la transacción
          </h2>

          {selected ? (
            <>
              {/* Selected header with circular icon and big amount */}
              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${
                    selected.kind === "Income"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : selected.kind === "Expense"
                      ? "bg-rose-500/15 text-rose-400"
                      : selected.kind === "Transfer"
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-sky-500/15 text-sky-400"
                  }`}
                >
                  <SelectedIcon className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-foreground">
                    {selected.description || "Sin descripción"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateTimeLabel(selected.occurredAt)}
                  </p>
                </div>
              </div>

              {/* Big amount in selected currency */}
              <div className="my-4">
                <Amount
                  value={selected.direction === "Income"
                    ? toTargetCurrency(selected.amount, selected.currency, selectedCurrency, p2pRate)
                    : toTargetCurrency(selected.amount, selected.currency, selectedCurrency, p2pRate).negated()}
                  currency={selectedCurrency}
                  sign={selected.direction === "Income" ? "always" : "auto"}
                  size="xl"
                  tone={selected.direction === "Income" ? "income" : "expense"}
                  className="tracking-tight"
                />
                {selected.currency !== selectedCurrency && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Monto original: {formatAmountText(selected.amount, selected.currency, numberPreferences)}
                  </p>
                )}
              </div>

              {/* Key-Value Details */}
              <dl className="space-y-3 border-t border-border/80 pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="size-4" />
                    Categoría
                  </dt>
                  <dd>
                    <Badge
                      variant="purple"
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {selected.categoryName || "Sin categoría"}
                    </Badge>
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Landmark className="size-4" />
                    Cuenta
                  </dt>
                  <dd className="font-medium text-foreground">
                    {selected.accountName}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4" />
                    Tipo
                  </dt>
                  <dd>
                    <Badge
                      variant={
                        selected.kind === "Income"
                          ? "success"
                          : selected.kind === "Expense"
                          ? "expense"
                          : selected.kind === "Transfer"
                          ? "transfer"
                          : selected.kind === "Adjustment"
                          ? "default"
                          : "investment"
                      }
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                      {kindLabel(selected.kind, selected.investmentCashKind)}
                    </Badge>
                  </dd>
                </div>

                {selected.description && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="size-4" />
                      Notas
                    </dt>
                    <dd className="truncate text-right font-medium text-foreground">
                      {selected.description}
                    </dd>
                  </div>
                )}

                {selected.kind === "Investment" && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Inversión</dt>
                    <dd className="text-right font-medium text-foreground">
                      {investmentsController.investments.find(
                        (i) => i.id === selected.investmentId
                      )?.name ||
                        selected.investmentId ||
                        "No especificada"}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Category Allocations if any */}
              {selected.allocations.length > 0 && (
                <div className="mt-4 border-t border-border/80 pt-3">
                  <b className="text-xs font-semibold uppercase text-muted-foreground">
                    Distribución por categoría
                  </b>
                  <div className="mt-2 space-y-1">
                    {selected.allocations.map((a) => (
                      <div
                        key={a.categoryId}
                        className="flex justify-between gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {a.categoryName || "Categoría"}
                        </span>
                        <Amount value={a.amount} currency={selected.currency} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfer Legs if any */}
              {selected.legs.length > 0 && (
                <div className="mt-4 border-t border-border/80 pt-3">
                  <b className="text-xs font-semibold uppercase text-muted-foreground">
                    Tramos de transferencia
                  </b>
                  <div className="mt-2 space-y-2">
                    {selected.legs.map((l) => (
                      <div key={l.id} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            {l.accountName}
                          </span>
                          <Amount
                            value={l.direction === "Income" ? l.amount : new Decimal(l.amount).negated()}
                            currency={l.currency}
                            sign={l.direction === "Income" ? "always" : "auto"}
                            size="sm"
                          />
                        </div>
                        {l.appliedRate && (
                          <span className="block text-xs text-muted-foreground">
                            Tasa {formatCurrencyLabel("BOB")} {formatNumber(l.appliedRate)} · {l.rateSource || "Manual"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.isReversal && (
                <p className="mt-3 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  Movimiento de auditoría:{" "}
                  {selected.reversesId
                    ? `revierte ${selected.reversesId}`
                    : "reversión"}
                </p>
              )}

              {/* Actions Section */}
              <MovementActions
                http={http}
                movement={selected}
                accounts={accounts}
                auditMode={mode === "Audit"}
                onEdit={
                  onEditTxn && selected.kind !== "Transfer" && selected.kind !== "Investment"
                    ? () =>
                        onEditTxn({
                          id: selected.id,
                          accountId: selected.accountId,
                          amount: selected.amount,
                          currency: selected.currency,
                          direction: selected.direction as "Income" | "Expense",
                          categoryId: selected.categoryId,
                          occurredAt: selected.occurredAt,
                          description: selected.description,
                          appliedRate: selected.appliedRate,
                          rateSource: selected.rateSource,
                          createdAt: selected.occurredAt,
                          reversesId: selected.reversesId,
                          transferId: selected.kind === "Transfer" ? selected.id : undefined,
                          allocations: selected.allocations.map((a) => ({
                            categoryId: a.categoryId,
                            categoryName: a.categoryName,
                            amount: a.amount,
                          })),
                        })
                    : undefined
                }
                onComplete={
                  selected.kind === "Investment"
                    ? refreshAfterInvestmentWrite
                    : refreshAfterWrite
                }
                reverseInvestmentCash={async (id) => {
                  await investmentsController.reverseCash(id);
                }}
              />
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Selecciona una transacción para ver sus detalles.
            </p>
          )}
        </aside>
      </div>

      {!loading && movements.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <ArrowLeftRight className="mx-auto mb-2 size-8 text-muted-foreground/60" />
          <p className="font-medium">No hay transacciones para estos filtros.</p>
        </div>
      )}

      {/* Modals for secondary actions */}
      <FxTransferModal
        isOpen={transferOpen}
        accounts={accounts}
        p2pRate={p2pRate}
        onClose={() => setTransferOpen(false)}
        onConfirmTransfer={async (data) => {
          await onExecuteFxTransfer({ ...data, p2pRate });
          reload();
        }}
      />
      <InvestmentCashModal
        open={cashOpen}
        onClose={() => setCashOpen(false)}
        controller={investmentsController}
        accounts={accounts}
        onComplete={refreshAfterWrite}
      />
    </div>
  );
}
