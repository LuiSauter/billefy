"use client";

import React, { useMemo, useState } from "react";
import {
  RotateCcw,
  ArrowDown,
  ArrowUpRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  Plus,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  List,
  Wifi,
  Zap,
  Home,
  Briefcase,
  Landmark,
  Car,
  Music,
  CreditCard,
  Edit2,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import {
  IPlanningRepository,
  RecurringFlowType,
  RecurringFrequency,
  RecurringPaymentDto,
  RecurringStatus,
} from "../domain/planning.types";

export interface RecurringItem {
  id: string;
  name: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysRemaining: number;
  periodicity: string;
  status: "DueSoon" | "Scheduled";
}
import { useRecurringPayments } from "../application/useRecurringPayments";
import { CreateRecurringModal } from "./CreateRecurringModal";
import { ConfirmRecurringPaymentModal } from "./ConfirmRecurringPaymentModal";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Amount } from "@/shared/ui/amount";
import { formatAmountText } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export interface RecurringPaymentsViewProps {
  repository?: IPlanningRepository | null;
  accounts?: AccountDto[];
  selectedCurrency?: string;
  p2pRate?: number;
  onOpenRescheduleModal?: (item: RecurringPaymentDto) => void;
  onFinancialDataChange?: () => void;
}

function calculateMonthOccurrences(
  payments: RecurringPaymentDto[],
  year: number,
  month: number
): Map<string, { payment: RecurringPaymentDto; dateString: string }[]> {
  const map = new Map<string, { payment: RecurringPaymentDto; dateString: string }[]>();

  const endOfMonth = new Date(year, month + 1, 0);
  const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

  for (const p of payments) {
    if (p.status === "Completed" || p.status === "Paused") continue;

    const parts = p.nextDueDate.split("-").map(Number);
    if (parts.length !== 3) continue;
    const [curY, curM, curD] = parts;
    const curDate = new Date(curY, curM - 1, curD);
    let count = p.completedOccurrences;

    let loops = 0;
    while (curDate <= endOfMonth && loops < 50) {
      loops++;
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, "0");
      const d = String(curDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      if (p.endType === "AfterOccurrences" && p.totalOccurrences && count >= p.totalOccurrences) {
        break;
      }
      if (p.endType === "OnDate" && p.endDate && dateStr > p.endDate) {
        break;
      }

      if (dateStr >= startStr && dateStr <= endStr) {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push({ payment: p, dateString: dateStr });
      }

      if (p.frequency === "Weekly") {
        curDate.setDate(curDate.getDate() + 7);
      } else if (p.frequency === "BiWeekly") {
        curDate.setDate(curDate.getDate() + 14);
      } else if (p.frequency === "Monthly") {
        curDate.setMonth(curDate.getMonth() + 1);
      } else if (p.frequency === "Quarterly") {
        curDate.setMonth(curDate.getMonth() + 3);
      } else if (p.frequency === "SemiAnnual") {
        curDate.setMonth(curDate.getMonth() + 6);
      } else if (p.frequency === "Yearly") {
        curDate.setFullYear(curDate.getFullYear() + 1);
      } else {
        curDate.setMonth(curDate.getMonth() + 1);
      }
      count++;
    }
  }

  return map;
}

export function RecurringPaymentsView({
  repository,
  accounts = [],
  selectedCurrency = "BOB",
  p2pRate = 1,
  onOpenRescheduleModal,
  onFinancialDataChange,
}: RecurringPaymentsViewProps) {
  void p2pRate;
  const { categories } = useUserCategories();
  const numberPreferences = useNumberPreferences();

  // If repository is provided, use real hook; otherwise fallback to empty safe mock
  const recurringHook = useRecurringPayments({
    repository: repository ?? ({} as IPlanningRepository),
    currency: selectedCurrency,
    autoLoad: Boolean(repository),
  });

  const {
    filteredPayments,
    upcomingPayments,
    activeEventDates,
    summary,
    loading,
    search,
    setSearch,
    flowTypeFilter,
    setFlowTypeFilter,
    statusFilter,
    setStatusFilter,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    rescheduleRecurring,
    togglePause,
    confirmPayment,
  } = recurringHook;

  // Tabs: "lista" | "calendario"
  const [activeTab, setActiveTab] = useState<"lista" | "calendario">("lista");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringPaymentDto | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<RecurringPaymentDto | null>(null);
  const [reschedulingItem, setReschedulingItem] = useState<RecurringPaymentDto | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");

  // Pagination state (8 per page like in the mockup)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Mini-calendar date state (selected month/year)
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  // Projected occurrences for the currently viewed month
  const monthOccurrencesMap = useMemo(() => {
    return calculateMonthOccurrences(filteredPayments, calendarDate.getFullYear(), calendarDate.getMonth());
  }, [filteredPayments, calendarDate]);

  const displayedEventDates = useMemo(() => {
    const set = new Set<string>(activeEventDates);
    for (const key of monthOccurrencesMap.keys()) {
      set.add(key);
    }
    return set;
  }, [activeEventDates, monthOccurrencesMap]);

  // Calendar month days generation
  const monthInfo = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday as start (0 = Lun, ..., 6 = Dom)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const monthStr = String(month).padStart(2, "0"); // previous month (1-indexed is month)
      prevDays.push({
        day: d,
        dateString: `${year}-${monthStr}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    const currentDays: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, "0");
      currentDays.push({
        day: d,
        dateString: `${year}-${monthStr}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete grid (42 cells: 6 rows of 7)
    const totalFilled = prevDays.length + currentDays.length;
    const nextDays: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];
    const remaining = (7 - (totalFilled % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const monthStr = String(month + 2).padStart(2, "0");
      nextDays.push({
        day: d,
        dateString: `${year}-${monthStr}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    return {
      year,
      monthName: monthNames[month],
      allCells: [...prevDays, ...currentDays, ...nextDays],
    };
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleConfirmPayment = async (
    id: string,
    req: { accountId: string; amount: number; description?: string }
  ) => {
    await confirmPayment(id, req);
    if (onFinancialDataChange) {
      onFinancialDataChange();
    }
  };

  const handleOpenEdit = (item: RecurringPaymentDto) => {
    setEditingItem(item);
    setIsCreateOpen(true);
  };

  const handleOpenReschedule = (item: RecurringPaymentDto) => {
    if (onOpenRescheduleModal) {
      onOpenRescheduleModal(item);
    } else {
      setReschedulingItem(item);
      setRescheduleDate(item.nextDueDate);
    }
  };

  const handleSaveReschedule = async () => {
    if (reschedulingItem && rescheduleDate) {
      await rescheduleRecurring(reschedulingItem.id, rescheduleDate);
      setReschedulingItem(null);
    }
  };

  // Helper to resolve category name
  const getCategoryName = (catId?: string | null) => {
    if (!catId) return "General";
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : "General";
  };

  // Helper to render branded / category logo
  const renderItemLogo = (name: string, flowType: RecurringFlowType) => {
    const n = name.toLowerCase();
    if (n.includes("netflix")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center font-black text-sm shrink-0">
          N
        </div>
      );
    }
    if (n.includes("spotify")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("internet") || n.includes("wifi") || n.includes("fibra") || n.includes("tigo") || n.includes("entel")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Wifi className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("luz") || n.includes("electric") || n.includes("delapaz") || n.includes("cre") || n.includes("elfec")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("alquiler") || n.includes("renta") || n.includes("depa") || n.includes("casa")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <Home className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("salario") || n.includes("sueldo") || n.includes("nomina") || flowType === "Income") {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("prestamo") || n.includes("cuota") || n.includes("banco") || n.includes("bcp") || n.includes("bnb")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
          <Landmark className="w-4 h-4" />
        </div>
      );
    }
    if (n.includes("auto") || n.includes("car") || n.includes("seguro")) {
      return (
        <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
          <Car className="w-4 h-4" />
        </div>
      );
    }

    return (
      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
        <CreditCard className="w-4 h-4" />
      </div>
    );
  };

  // Format frequency label
  const formatFrequency = (freq: RecurringFrequency) => {
    switch (freq) {
      case "Weekly": return "Semanal";
      case "BiWeekly": return "Quincenal";
      case "Monthly": return "Mensual";
      case "Quarterly": return "Trimestral";
      case "SemiAnnual": return "Semestral";
      case "Yearly": return "Anual";
      default: return freq;
    }
  };

  // Format date display (e.g. 15 oct 2026)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const day = date.getDate();
      const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return `${day} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };


  return (
    <div className="w-full max-w-[1340px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 text-foreground">
      {/* 1. Header (OpenPencil / Mockup RWHead) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Pagos y movimientos recurrentes
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
            Administra tus ingresos, gastos, suscripciones y otros movimientos que se repiten automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <button
              onClick={() => {
                setStatusFilter(statusFilter === "All" ? "Active" : "All");
              }}
              className="h-10 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition flex items-center gap-2 shadow-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{statusFilter === "Active" ? "Solo activos" : "Todos los recurrentes"}</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsCreateOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo recurrente</span>
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Summary Cards (Mockup) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Recurrentes activos */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/20 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200/80">Recurrentes activos</span>
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-foreground">
            {summary?.activeCount ?? filteredPayments.filter((p) => p.status === "Active").length}
          </div>
        </div>

        {/* Card 2: Gastos mensuales */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gastos mensuales</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <Amount value={summary?.monthlyExpenses ?? 0} currency={selectedCurrency} size="lg" />
          </div>
        </div>

        {/* Card 3: Ingresos mensuales */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Ingresos mensuales</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <Amount value={summary?.monthlyIncome ?? 0} currency={selectedCurrency} size="lg" />
          </div>
        </div>

        {/* Card 4: Próximos 7 días */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Próximos 7 días</span>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {summary?.upcoming7DaysCount ?? upcomingPayments.length}
            </span>
            {(summary?.upcoming7DaysTotal ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs border border-purple-500/25">
                <Amount value={summary?.upcoming7DaysTotal ?? 0} currency={selectedCurrency} size="xs" className="text-purple-300" />
              </span>
            )}
          </div>
        </div>

        {/* Card 5: Vencidos */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Vencidos</span>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {summary?.overdueCount ?? 0}
            </span>
            {(summary?.overdueCount ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30">
                <Amount value={summary?.overdueTotal ?? 0} currency={selectedCurrency} size="xs" className="text-rose-300" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Layout (Table Area + Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Table & View (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* View Tabs & Filters Bar */}
          <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            {/* View Mode Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-background border border-border shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("lista")}
                className={`h-8 px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "lista"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista de recurrentes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("calendario")}
                className={`h-8 px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "calendario"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              {/* Search */}
              <div className="relative min-w-[160px] flex-1 sm:max-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar recurrente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs rounded-lg"
                />
              </div>

              {/* Type filter */}
              <Select
                value={flowTypeFilter}
                onValueChange={(val) => val && setFlowTypeFilter(val as "All" | RecurringFlowType)}
              >
                <SelectTrigger aria-label="Filtrar por tipo" className="h-8 w-[130px] rounded-lg text-xs">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Todos los tipos</SelectItem>
                  <SelectItem value="Expense">Solo Gastos</SelectItem>
                  <SelectItem value="Income">Solo Ingresos</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(val) => val && setStatusFilter(val as "All" | RecurringStatus | "Overdue")}
              >
                <SelectTrigger aria-label="Filtrar por estado" className="h-8 w-[130px] rounded-lg text-xs">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Todos los estados</SelectItem>
                  <SelectItem value="Active">Activo</SelectItem>
                  <SelectItem value="Paused">Pausado</SelectItem>
                  <SelectItem value="Overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table / List View */}
          {activeTab === "lista" ? (
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs flex flex-col">
              {loading && filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  Cargando pagos recurrentes...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">No se encontraron movimientos recurrentes</p>
                    <p className="text-muted-foreground mt-1 max-w-sm">
                      {search || flowTypeFilter !== "All" || statusFilter !== "All"
                        ? "Ningún elemento coincide con los filtros aplicados."
                        : "Comienza registrando tus suscripciones, servicios, alquiler o salario."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setIsCreateOpen(true);
                    }}
                    className="mt-2 h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                  >
                    + Registrar primer recurrente
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Nombre</th>
                        <th className="py-3 px-3">Tipo</th>
                        <th className="py-3 px-3">Frecuencia</th>
                        <th className="py-3 px-3">Monto</th>
                        <th className="py-3 px-3">Próxima fecha</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedPayments.map((item) => {
                        const isExpense = item.flowType === "Expense";
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/30 transition group"
                          >
                            {/* Nombre con Logo & Subtítulo */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {renderItemLogo(item.name, item.flowType)}
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-[13px] text-foreground">
                                    {item.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {getCategoryName(item.categoryId)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Tipo (Badge Gasto / Ingreso) */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                  isExpense
                                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                {isExpense ? "Gasto" : "Ingreso"}
                              </span>
                            </td>

                            {/* Frecuencia con progreso de cuotas/fecha fin */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatFrequency(item.frequency)}</span>
                                </div>
                                {item.endType === "AfterOccurrences" && item.totalOccurrences && (
                                  <span className="text-[10px] text-purple-300 font-semibold">
                                    Cuota {item.completedOccurrences}/{item.totalOccurrences}
                                  </span>
                                )}
                                {item.endType === "OnDate" && item.endDate && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Hasta {formatDateDisplay(item.endDate)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Monto */}
                            <td className="py-3 px-3">
                              <Amount value={item.amount} currency={item.currency} size="sm" />
                            </td>

                            {/* Próxima fecha */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon
                                  className={`w-3.5 h-3.5 ${
                                    item.isOverdue ? "text-rose-400" : "text-muted-foreground"
                                  }`}
                                />
                                <span
                                  className={
                                    item.isOverdue
                                      ? "text-rose-400 font-bold"
                                      : "text-foreground"
                                  }
                                >
                                  {formatDateDisplay(item.nextDueDate)}
                                </span>
                              </div>
                            </td>

                            {/* Estado (Activo / Pausado / Completado) */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                  item.status === "Completed"
                                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                    : item.status === "Active"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {item.status === "Completed"
                                  ? "Completado"
                                  : item.status === "Active"
                                  ? "Activo"
                                  : "Pausado"}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Direct Accept / Pay button */}
                                <button
                                  type="button"
                                  onClick={() => setConfirmingItem(item)}
                                  title="Aceptar y asentar pago"
                                  className="h-7 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] transition flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span className="hidden sm:inline">Aceptar</span>
                                </button>

                                {/* Action buttons */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenReschedule(item)}
                                  title="Reprogramar fecha"
                                  className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Editar"
                                  className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => togglePause(item.id, item.status)}
                                  title={item.status === "Active" ? "Pausar" : "Reactivar"}
                                  className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                                >
                                  {item.status === "Active" ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Eliminar definitivamente el recurrente ${item.name}?`)) {
                                      deleteRecurring(item.id);
                                    }
                                  }}
                                  title="Eliminar"
                                  className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 flex items-center justify-center transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer / Pagination */}
              {filteredPayments.length > 0 && (
                <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Mostrando {paginatedPayments.length} de {filteredPayments.length} recurrentes
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition text-foreground"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            currentPage === pageNum
                              ? "bg-purple-600 text-white"
                              : "border border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition text-foreground"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Calendar Full Tab View */
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">
                  {monthInfo.monthName} {monthInfo.year}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-1 font-bold text-muted-foreground">
                    {d}
                  </div>
                ))}
                {monthInfo.allCells.map((cell, idx) => {
                  const itemsOnDay = monthOccurrencesMap.get(cell.dateString) ?? [];
                  const hasEvents = itemsOnDay.length > 0 || displayedEventDates.has(cell.dateString);
                  return (
                    <div
                      key={idx}
                      className={`min-h-[75px] p-1.5 rounded-xl border flex flex-col justify-between text-left transition ${
                        cell.isCurrentMonth
                          ? "bg-background border-border text-foreground"
                          : "bg-muted/10 border-transparent text-muted-foreground/40"
                      } ${hasEvents ? "border-purple-500/40 bg-purple-500/5" : ""}`}
                    >
                      <span className="font-mono text-[11px] font-bold">{cell.day}</span>
                      <div className="flex flex-col gap-1 mt-1">
                        {itemsOnDay.map(({ payment: ev }) => (
                          <button
                            key={`${ev.id}-${cell.dateString}`}
                            type="button"
                            onClick={() => setConfirmingItem(ev)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-semibold transition text-left border ${
                              ev.flowType === "Expense"
                                ? "bg-purple-600/20 text-purple-200 border-purple-500/30 hover:bg-purple-600/30"
                                : "bg-emerald-600/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-600/30"
                            }`}
                            title={`${ev.name} - ${formatAmountText(ev.amount, ev.currency, numberPreferences)} (Click para aceptar pago)`}
                          >
                            {ev.name} • <Amount value={ev.amount} currency={ev.currency} size="xs" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Widgets (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Widget 1: Mini Calendario (Próximos movimientos) */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-foreground tracking-tight">
                Próximos movimientos
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-foreground font-mono">
                  {monthInfo.monthName} {monthInfo.year}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mini Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="py-1 font-semibold text-muted-foreground text-[10px]">
                  {d}
                </div>
              ))}
              {monthInfo.allCells.map((cell, idx) => {
                const hasEvent = displayedEventDates.has(cell.dateString);
                const isSelected = selectedDayString === cell.dateString;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDayString(
                        selectedDayString === cell.dateString ? null : cell.dateString
                      );
                    }}
                    className={`h-7 w-full rounded-lg flex flex-col items-center justify-center relative transition ${
                      !cell.isCurrentMonth
                        ? "text-muted-foreground/30"
                        : isSelected
                        ? "bg-purple-600 text-white font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasEvent && cell.isCurrentMonth && (
                      <span
                        className={`w-1 h-1 rounded-full absolute bottom-1 ${
                          isSelected ? "bg-white" : "bg-purple-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day occurrences panel */}
            {selectedDayString && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Pagos para el {formatDateDisplay(selectedDayString)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDayString(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
                {(monthOccurrencesMap.get(selectedDayString) ?? []).length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    Sin pagos programados en esta fecha.
                  </span>
                ) : (
                  (monthOccurrencesMap.get(selectedDayString) ?? []).map(({ payment: item }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Amount value={item.amount} currency={item.currency} size="xs" />
                        <button
                          type="button"
                          onClick={() => setConfirmingItem(item)}
                          className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Widget 2: Próximos pagos (7 días) */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-foreground tracking-tight">
                Próximos pagos (7 días)
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("Active")}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 transition"
              >
                Ver todo →
              </button>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay pagos pendientes en los próximos 7 días.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcomingPayments.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-background border border-border hover:border-purple-500/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderItemLogo(item.name, item.flowType)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-xs text-foreground truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] ${
                            item.isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {item.isOverdue ? "Vencido" : formatDateDisplay(item.nextDueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Amount value={item.amount} currency={item.currency} size="xs" className="text-rose-400" />
                      <button
                        type="button"
                        onClick={() => setConfirmingItem(item)}
                        title="Aceptar pago"
                        className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition shadow-2xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Aceptar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateRecurringModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        onSubmitCreate={createRecurring}
        onSubmitUpdate={updateRecurring}
        accounts={accounts}
        editingItem={editingItem}
        selectedCurrency={selectedCurrency}
      />

      <ConfirmRecurringPaymentModal
        isOpen={Boolean(confirmingItem)}
        onClose={() => setConfirmingItem(null)}
        item={confirmingItem}
        accounts={accounts}
        onConfirm={handleConfirmPayment}
      />

      <ResponsiveDrawer
        open={!!reschedulingItem}
        onOpenChange={(open) => { if (!open) setReschedulingItem(null); }}
        title={reschedulingItem ? `Reprogramar ${reschedulingItem.name}` : "Reprogramar"}
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setReschedulingItem(null)}>Cancelar</Button>
            <Button type="submit" form="reschedule-form">Guardar fecha</Button>
          </>
        }
      >
        <form id="reschedule-form" onSubmit={(e) => { e.preventDefault(); handleSaveReschedule(); }}>
          <FormField label="Nueva fecha de vencimiento">
            {(control) => (
              <Input {...control} type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            )}
          </FormField>
        </form>
      </ResponsiveDrawer>
    </div>
  );
}
