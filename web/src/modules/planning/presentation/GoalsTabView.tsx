"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";
import { GoalDto, UpdateGoalRequest, GoalFundingEntryDto, GoalFundingKind, GoalFundingRequest } from "../domain/planning.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { notify } from "@/shared/lib/notify";

// Presentation Components
import { GoalsKpiCards } from "./GoalsKpiCards";
import { GoalCard } from "./GoalCard";
import { GoalsSummaryPanel } from "./GoalsSummaryPanel";
import { EditGoalModal } from "./EditGoalModal";
import { GoalFundingModal } from "./GoalFundingModal";
import { Amount } from "@/shared/ui/amount";

type GoalStatusFilter = "Todas" | "En progreso" | "Completadas" | "Pausadas";
type GoalSortOption = "fecha" | "progreso" | "monto";

interface GoalsTabViewProps {
  goals: GoalDto[];
  accounts?: AccountDto[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onOpenCreateGoalModal: () => void;
  onOpenAccounts?: () => void;
  onOpenPlan?: () => void;
  onUpdateGoal?: (id: string, req: UpdateGoalRequest) => Promise<void>;
  onDeleteGoal?: (id: string) => Promise<void>;
  onRecordGoalFunding?: (id: string, kind: GoalFundingKind, request: GoalFundingRequest, key: string) => Promise<void>;
  onGetGoalFunding?: (id: string) => Promise<GoalFundingEntryDto[]>;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
}

export function GoalsTabView({
  goals = [],
  accounts = [],
  loading = false,
  error = null,
  onRetry = () => {},
  onOpenCreateGoalModal,
  onOpenAccounts,
  onOpenPlan,
  onUpdateGoal,
  onDeleteGoal,
  onRecordGoalFunding,
  onGetGoalFunding,
  selectedCurrency = "USD",
  p2pRate: _p2pRate = 9.85,
}: GoalsTabViewProps) {
  void _p2pRate;
  const [fundingGoal, setFundingGoal] = useState<GoalDto | null>(null);
  const shortfalls = Array.from(new Map(goals.filter(goal => goal.fundingMode === "ReservedFunds" && goal.accountId && (goal.accountFundingShortfall ?? 0) > 0)
    .map(goal => [`${goal.accountId}:${goal.currency}`, goal])).values());
  const [editingGoal, setEditingGoal] = useState<GoalDto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("Todas");
  const [sortBy, setSortBy] = useState<GoalSortOption>("fecha");

  // Filtered & Sorted Goals
  const filteredGoals = useMemo(() => {
    let result = [...goals];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.accountName || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === "En progreso") {
      result = result.filter(
        (g) =>
          (g.percentageAchieved ?? 0) < 100 &&
          g.trackingStatus !== "unlinked" &&
          g.trackingStatus !== "unavailable"
      );
    } else if (statusFilter === "Completadas") {
      result = result.filter((g) => (g.percentageAchieved ?? 0) >= 100);
    } else if (statusFilter === "Pausadas") {
      result = result.filter(
        (g) =>
          g.trackingStatus === "unlinked" ||
          g.trackingStatus === "unavailable"
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "progreso") {
        return (b.percentageAchieved ?? 0) - (a.percentageAchieved ?? 0);
      }
      if (sortBy === "monto") {
        return (b.targetAmount ?? 0) - (a.targetAmount ?? 0);
      }
      return (a.monthsRemaining ?? 999) - (b.monthsRemaining ?? 999);
    });

    return result;
  }, [goals, searchQuery, statusFilter, sortBy]);

  const handleDeleteGoal = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("¿Estás seguro de que querés eliminar esta meta?")) {
      return;
    }
    try {
      if (onDeleteGoal) {
        await onDeleteGoal(id);
        notify.success("Meta eliminada", "Se eliminó la meta correctamente.");
      }
    } catch (err) {
      notify.error(
        "Error al eliminar",
        err instanceof Error ? err.message : "No se pudo eliminar la meta."
      );
    }
  };

  const handleUpdateGoal = async (id: string, req: UpdateGoalRequest) => {
    if (onUpdateGoal) {
      await onUpdateGoal(id, req);
      notify.success("Meta actualizada", "Se guardaron los cambios de la meta.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">
            Metas
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">
            Define tus objetivos financieros y da seguimiento a tu progreso.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateGoalModal}
          className="h-10 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-900/30 transition active:scale-[0.99] shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear meta</span>
        </button>
      </div>

      {/* 2. Top 4 KPI Cards */}
      <GoalsKpiCards goals={goals} currency={selectedCurrency} />

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar metas..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#131B2E] border border-[#1E293B] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition shadow-2xs"
          />
        </div>

        {/* Filter Pills + Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-900/60 border border-slate-800/80">
            {(["Todas", "En progreso", "Completadas", "Pausadas"] as GoalStatusFilter[]).map(
              (tab) => {
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                      isActive
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    {tab}
                  </button>
                );
              }
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              aria-label="Ordenar metas"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as GoalSortOption)}
              className="h-9 pl-3.5 pr-8 rounded-xl border border-[#1E293B] bg-[#131B2E] hover:bg-slate-800/80 text-xs font-semibold text-slate-300 appearance-none cursor-pointer transition shadow-2xs focus:outline-none"
            >
              <option value="fecha" className="bg-[#131B2E] text-white">
                Ordenar por: Próxima fecha
              </option>
              <option value="progreso" className="bg-[#131B2E] text-white">
                Ordenar por: Mayor progreso
              </option>
              <option value="monto" className="bg-[#131B2E] text-white">
                Ordenar por: Mayor monto
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Loading or Error notice */}
      {loading && goals.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-400 bg-[#131B2E] rounded-2xl border border-[#1E293B] animate-pulse">
          Cargando metas financieras…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3">
          <span>No se pudieron sincronizar las metas.</span>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 font-bold transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {shortfalls.map(goal => <section key={`${goal.accountId}:${goal.currency}`} role="status" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <h2 className="font-semibold">Faltante de respaldo · {goal.accountName || "Cuenta vinculada"}</h2>
        <p><Amount value={goal.accountFundingShortfall ?? 0} currency={goal.currency} size="sm" /> compartido por las metas de esta cuenta. Es un único faltante de la cuenta, no un importe adicional por cada meta.</p>
        <p className="mt-1 text-muted-foreground">Los gastos siguen permitidos y tus asignaciones se conservan. Podés reponer saldo o liberar parte de las reservas.</p>
      </section>)}

      {/* 4. Main Grid (Left 8 cols) + Summary Panel (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Goals Grid (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={setEditingGoal}
                onDelete={handleDeleteGoal}
                onFunding={onRecordGoalFunding ? setFundingGoal : undefined}
              />
            ))}
          </div>
        </div>

        {/* Right: Summary Panel (4/12) */}
        <div className="lg:col-span-4">
          <GoalsSummaryPanel
            goals={goals}
            currency={selectedCurrency}
            onOpenPlan={onOpenPlan}
          />
        </div>
      </div>

      {fundingGoal && onRecordGoalFunding && <GoalFundingModal key={fundingGoal.id} goal={goals.find(goal => goal.id === fundingGoal.id) || fundingGoal} onClose={() => setFundingGoal(null)} onSubmit={onRecordGoalFunding} onGetHistory={onGetGoalFunding} />}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          accounts={accounts}
          onClose={() => setEditingGoal(null)}
          onSubmit={handleUpdateGoal}
          onOpenAccounts={onOpenAccounts}
        />
      )}
    </div>
  );
}
