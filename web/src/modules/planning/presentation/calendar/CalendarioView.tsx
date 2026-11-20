"use client";

import React, { useState, useMemo } from "react";
import { CalendarioHeader } from "./CalendarioHeader";
import { CalendarioKpiCards } from "./CalendarioKpiCards";
import { CalendarioToolbar, CalendarViewMode } from "./CalendarioToolbar";
import { CalendarioMonthGrid } from "./CalendarioMonthGrid";
import { CalendarioWeekView } from "./CalendarioWeekView";
import { CalendarioDayView } from "./CalendarioDayView";
import { CalendarioSidePanel } from "./CalendarioSidePanel";
import { CreateRecurringModal } from "../CreateRecurringModal";
import { useRecurringPayments } from "../../application/useRecurringPayments";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import {
  calculateCalendarAnalytics,
  generateMonthGrid,
  generateWeekDays,
  CalendarFilters,
  CalendarEvent,
} from "../../domain/calendar-analytics";
import type { IPlanningRepository } from "../../domain/planning.types";
import type { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";

export interface CalendarioViewProps {
  repository?: IPlanningRepository | null;
  accounts?: AccountDto[];
  loans?: LoanSummaryDto[];
  transactions?: TransactionDto[];
  selectedCurrency?: string;
  p2pRate?: number;
  onFinancialDataChange?: () => void;
}

export function CalendarioView({
  repository,
  accounts = [],
  loans = [],
  transactions = [],
  selectedCurrency = "BOB",
  p2pRate = 10,
  onFinancialDataChange,
}: CalendarioViewProps) {
  const effectiveCurrency = selectedCurrency === "USD" ? "USD" : "BOB";

  // Recurring Payments hook
  const fallbackRepo = useMemo<IPlanningRepository>(() => {
    if (repository) return repository;
    return {
      createBudget: async () => ({ id: "" }),
      getBudgets: async () => [],
      updateBudget: async () => {},
      deleteBudget: async () => ({ message: "" }),
      createGoal: async () => ({ id: "" }),
      updateGoal: async () => ({ message: "" }),
      getGoals: async () => [],
      deleteGoal: async () => ({ message: "" }),
      getFinancialHealth: async () => ({ score: 83, level: "Good", description: "Salud financiera sólida" } as never),
      proposeIncomeDistribution: async () => ({ needs: { percentage: 50, amount: 0, categories: [] }, wants: { percentage: 30, amount: 0, categories: [] }, savings: { percentage: 20, amount: 0, categories: [] } }),
      getRecurringPayments: async () => [],
      getRecurringSummary: async () => ({
        ActiveCount: 0,
        MonthlyExpenses: 0,
        MonthlyIncome: 0,
        Currency: effectiveCurrency,
        Upcoming7DaysCount: 0,
        Upcoming7DaysTotal: 0,
        OverdueCount: 0,
        OverdueTotal: 0,
      }),
      getRecurringCalendarOccurrences: async () => [],
      getRecurringPaymentById: async () => null as never,
      createRecurringPayment: async () => ({ id: "" }),
      updateRecurringPayment: async () => ({ message: "" }),
      rescheduleRecurringPayment: async () => ({ message: "" }),
      confirmRecurringPayment: async () => ({ transactionId: "" }),
      pauseRecurringPayment: async () => ({ message: "" }),
      resumeRecurringPayment: async () => ({ message: "" }),
      deleteRecurringPayment: async () => ({ message: "" }),
    } as unknown as IPlanningRepository;
  }, [repository, effectiveCurrency]);

  const {
    payments: recurringPayments,
    calendarOccurrences,
    createRecurring,
  } = useRecurringPayments({
    repository: fallbackRepo,
    currency: effectiveCurrency,
  });

  const { categories } = useUserCategories();

  // Date and View State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [viewMode, setViewMode] = useState<CalendarViewMode>("mes");
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Month & Year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate Calendar Analytics & Events
  const analytics = useMemo(() => {
    return calculateCalendarAnalytics({
      recurringPayments,
      recurringOccurrences: calendarOccurrences,
      loans,
      transactions,
      year,
      month,
      selectedCurrency: effectiveCurrency,
      p2pRate,
      filters,
    });
  }, [
    recurringPayments,
    calendarOccurrences,
    loans,
    transactions,
    year,
    month,
    effectiveCurrency,
    p2pRate,
    filters,
  ]);

  // Month Grid Cells
  const monthCells = useMemo(() => {
    return generateMonthGrid(year, month, analytics.filteredEvents);
  }, [year, month, analytics.filteredEvents]);

  // Week Days
  const weekDays = useMemo(() => {
    return generateWeekDays(selectedDate, analytics.filteredEvents);
  }, [selectedDate, analytics.filteredEvents]);

  // Day Events
  const dayEvents = useMemo(() => {
    return analytics.filteredEvents.filter((e) => e.date === selectedDate);
  }, [analytics.filteredEvents, selectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "mes") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === "semana") {
      const parts = selectedDate.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] - 7);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${y}-${m}-${dayStr}`);
      setCurrentDate(new Date(y, d.getMonth(), 1));
    } else {
      const parts = selectedDate.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${y}-${m}-${dayStr}`);
      setCurrentDate(new Date(y, d.getMonth(), 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "mes") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === "semana") {
      const parts = selectedDate.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] + 7);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${y}-${m}-${dayStr}`);
      setCurrentDate(new Date(y, d.getMonth(), 1));
    } else {
      const parts = selectedDate.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${y}-${m}-${dayStr}`);
      setCurrentDate(new Date(y, d.getMonth(), 1));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleSelectMonth = (newYear: number, newMonth: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
    const d = String(1).padStart(2, "0");
    const m = String(newMonth + 1).padStart(2, "0");
    setSelectedDate(`${newYear}-${m}-${d}`);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(event.date);
  };

  // Date range label for the right panel
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const dateRangeLabel = `01/${String(month + 1).padStart(2, "0")}/${year} - ${String(
    lastDayOfMonth
  ).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Header with Month selector and New Event button */}
      <CalendarioHeader
        currentDate={currentDate}
        onSelectMonth={handleSelectMonth}
        onOpenNewEvent={() => setIsCreateModalOpen(true)}
      />

      {/* 2. Top 5 KPI Metric Cards */}
      <CalendarioKpiCards
        kpis={analytics.kpis}
        selectedCurrency={effectiveCurrency}
      />

      {/* 3. Main Split View: Calendar Area + Right Side Panel */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        {/* Left Column: Calendar Navigation Toolbar + Active Grid View */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-3.5">
          <CalendarioToolbar
            currentDate={currentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
          />

          {viewMode === "mes" && (
            <CalendarioMonthGrid
              cells={monthCells}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectEvent={handleSelectEvent}
              selectedCurrency={effectiveCurrency}
            />
          )}

          {viewMode === "semana" && (
            <CalendarioWeekView
              days={weekDays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectEvent={handleSelectEvent}
              selectedCurrency={effectiveCurrency}
            />
          )}

          {viewMode === "dia" && (
            <CalendarioDayView
              selectedDate={selectedDate}
              events={dayEvents}
              onSelectEvent={handleSelectEvent}
              selectedCurrency={effectiveCurrency}
            />
          )}
        </div>

        {/* Right Column: Side Panel (Filtros, Resumen del período, Próximos eventos) */}
        <CalendarioSidePanel
          accounts={accounts}
          categories={categories}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={() => setFilters({})}
          dateRangeLabel={dateRangeLabel}
          periodSummary={analytics.periodSummary}
          upcomingEvents={analytics.upcomingEvents}
          selectedDate={selectedDate}
          onSelectEventDate={setSelectedDate}
          onSelectEvent={handleSelectEvent}
          onViewAllUpcoming={() => setViewMode("dia")}
          selectedCurrency={effectiveCurrency}
        />
      </div>

      {/* Modal to Register New Event / Recurring */}
      <CreateRecurringModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitCreate={async (req) => {
          await createRecurring(req);
          onFinancialDataChange?.();
          setIsCreateModalOpen(false);
        }}
        accounts={accounts}
        selectedCurrency={effectiveCurrency}
      />
    </div>
  );
}
