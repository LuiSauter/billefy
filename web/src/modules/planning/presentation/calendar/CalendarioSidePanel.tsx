"use client";

import React from "react";
import {
  Filter,
  Landmark,
  ArrowLeftRight,
  Tag,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { getRelativeEventDateLabel } from "../../domain/calendar-analytics";
import type { CalendarEvent, CalendarFilters } from "../../domain/calendar-analytics";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";

interface CalendarioSidePanelProps {
  accounts: AccountDto[];
  categories?: { id: string; name: string }[];
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
  onClearFilters: () => void;
  dateRangeLabel: string; // e.g. "01/10/2026 - 31/10/2026"
  periodSummary: {
    ingresos: number;
    gastos: number;
    ahorro: number;
    savingsRate: number;
  };
  upcomingEvents: CalendarEvent[];
  selectedDate: string;
  onSelectEventDate: (dateString: string) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onViewAllUpcoming?: () => void;
  selectedCurrency: string;
}

export function CalendarioSidePanel({
  accounts,
  categories = [],
  filters,
  onFilterChange,
  onClearFilters,
  dateRangeLabel,
  periodSummary,
  upcomingEvents,
  selectedDate,
  onSelectEventDate,
  onSelectEvent,
  onViewAllUpcoming,
  selectedCurrency,
}: CalendarioSidePanelProps) {
  const numberPreferences = useNumberPreferences();

  // Filter accounts/types/categories helpers
  const handleAccountChange = (val: string | null) => {
    onFilterChange({ ...filters, accountId: !val || val === "all" ? undefined : val });
  };

  const handleTypeChange = (val: string | null) => {
    onFilterChange({ ...filters, type: !val || val === "all" ? undefined : val });
  };

  const handleCategoryChange = (val: string | null) => {
    onFilterChange({ ...filters, categoryId: !val || val === "all" ? undefined : val });
  };

  return (
    <div className="flex flex-col gap-4 w-full xl:w-[340px] shrink-0">
      {/* 1. FILTROS CARD */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Filtros</span>
          </CardTitle>
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
          >
            Limpiar
          </button>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col gap-2.5">
          {/* Todas las cuentas */}
          <div className="relative">
            <Select
              value={filters.accountId || "all"}
              onValueChange={handleAccountChange}
            >
              <SelectTrigger
                aria-label="Filtrar por cuenta"
                className="h-9 w-full rounded-xl text-xs bg-background/60 border-border pl-8 text-foreground"
              >
                <Landmark className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Todos los tipos */}
          <div className="relative">
            <Select
              value={filters.type || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger
                aria-label="Filtrar por tipo"
                className="h-9 w-full rounded-xl text-xs bg-background/60 border-border pl-8 text-foreground"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="income">Solo Ingresos</SelectItem>
                <SelectItem value="expense">Solo Gastos</SelectItem>
                <SelectItem value="recurring">Pagos Recurrentes</SelectItem>
                <SelectItem value="loan">Préstamos / Deudas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Todas las categorías */}
          <div className="relative">
            <Select
              value={filters.categoryId || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger
                aria-label="Filtrar por categoría"
                className="h-9 w-full rounded-xl text-xs bg-background/60 border-border pl-8 text-foreground"
              >
                <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Display */}
          <div className="flex items-center gap-2.5 h-9 px-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-muted-foreground">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{dateRangeLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. RESUMEN DEL PERÍODO CARD */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Resumen del período</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col gap-3">
          {/* Ingresos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Ingresos
              </span>
            </div>
            <Amount value={periodSummary.ingresos} currency={selectedCurrency} size="sm" className="text-emerald-400" />
          </div>

          {/* Gastos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Gastos
              </span>
            </div>
            <Amount value={periodSummary.gastos} currency={selectedCurrency} size="sm" />
          </div>

          {/* Ahorro */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Ahorro
              </span>
            </div>
            <Amount value={periodSummary.ahorro} currency={selectedCurrency} size="sm" className="text-purple-400" />
          </div>

          {/* Savings Rate Progress */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex-1">
              <Progress
                value={Math.min(Math.max(periodSummary.savingsRate, 0), 100)}
                className="h-2 bg-muted/60 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-indigo-500"
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
              {formatPercent(periodSummary.savingsRate, numberPreferences)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. PRÓXIMOS EVENTOS CARD */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Próximos eventos</span>
          </CardTitle>
          <button
            type="button"
            onClick={onViewAllUpcoming}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-0.5"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col divide-y divide-border/50">
          {upcomingEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground italic">
              No hay eventos próximos en este período
            </div>
          ) : (
            upcomingEvents.slice(0, 5).map((ev) => {
              const relativeLabel = getRelativeEventDateLabel(ev.date, selectedDate);
              const isSelectedDay = ev.date === selectedDate;

              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    onSelectEventDate(ev.date);
                    onSelectEvent?.(ev);
                  }}
                  className={`py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-muted/30 -mx-4 px-4 ${
                    isSelectedDay ? "bg-purple-500/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        !ev.isExpense
                          ? "bg-emerald-500/15 text-emerald-400"
                          : ev.type === "investment"
                          ? "bg-purple-500/15 text-purple-400"
                          : ev.type === "debt"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {!ev.isExpense ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {relativeLabel}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {ev.title}
                      </span>
                    </div>
                  </div>

                  <Amount
                    value={ev.isExpense ? -ev.amountInSelectedCurrency : ev.amountInSelectedCurrency}
                    currency={selectedCurrency}
                    size="xs"
                    className={!ev.isExpense ? "text-emerald-400" : "text-foreground"}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
