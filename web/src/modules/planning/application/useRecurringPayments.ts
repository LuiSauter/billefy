"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConfirmRecurringPaymentRequest,
  CreateRecurringPaymentRequest,
  IPlanningRepository,
  RecurringCalendarOccurrenceDto,
  RecurringFlowType,
  RecurringPaymentDto,
  RecurringStatus,
  RecurringSummaryDto,
  UpdateRecurringPaymentRequest,
} from "../domain/planning.types";
import { notify } from "@/shared/lib/notify";

export interface UseRecurringPaymentsOptions {
  repository: IPlanningRepository;
  currency?: string;
  autoLoad?: boolean;
}

export type StatusFilter = "All" | RecurringStatus | "Overdue";
export type FlowTypeFilter = "All" | RecurringFlowType;

export function useRecurringPayments({
  repository,
  currency = "BOB",
  autoLoad = true,
}: UseRecurringPaymentsOptions) {
  const [payments, setPayments] = useState<RecurringPaymentDto[]>([]);
  const [calendarOccurrences, setCalendarOccurrences] = useState<RecurringCalendarOccurrenceDto[]>([]);
  const [summary, setSummary] = useState<RecurringSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [flowTypeFilter, setFlowTypeFilter] = useState<FlowTypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, sumResult, calResult] = await Promise.allSettled([
        repository.getRecurringPayments(),
        repository.getRecurringSummary(currency),
        repository.getRecurringCalendarOccurrences
          ? repository.getRecurringCalendarOccurrences()
          : Promise.resolve([]),
      ]);

      if (listResult.status === "fulfilled") {
        setPayments(listResult.value);
      } else {
        throw listResult.reason;
      }

      if (sumResult.status === "fulfilled") {
        setSummary(sumResult.value);
      }

      if (calResult.status === "fulfilled") {
        setCalendarOccurrences(calResult.value ?? []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar pagos recurrentes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [repository, currency]);

  useEffect(() => {
    if (autoLoad) {
      void loadData();
    }
  }, [autoLoad, loadData]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Flow type filter
      if (flowTypeFilter !== "All" && p.flowType !== flowTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "Overdue") {
        if (!p.isOverdue) return false;
      } else if (statusFilter !== "All") {
        if (p.status !== statusFilter) return false;
      }

      // Search term
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesDesc = p.description?.toLowerCase().includes(term) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [payments, flowTypeFilter, statusFilter, search]);

  // Upcoming items (due within next 7 days or overdue)
  const upcomingPayments = useMemo(() => {
    return payments
      .filter((p) => p.status === "Active" && (p.isDueSoon || p.isOverdue))
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [payments]);

  // Dates with scheduled events for calendar markers
  const activeEventDates = useMemo(() => {
    const dates = new Set<string>();
    for (const occ of calendarOccurrences) {
      dates.add(occ.date);
    }
    for (const p of payments) {
      if (p.status === "Active") {
        dates.add(p.nextDueDate);
      }
    }
    return dates;
  }, [calendarOccurrences, payments]);

  // Mutations
  const createRecurring = async (req: CreateRecurringPaymentRequest) => {
    try {
      const result = await repository.createRecurringPayment(req);
      notify.success("Pago programado creado", `Se configuró el flujo para ${req.name}.`);
      await loadData();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear pago programado";
      notify.error("Error", msg);
      throw err;
    }
  };

  const updateRecurring = async (id: string, req: UpdateRecurringPaymentRequest) => {
    try {
      await repository.updateRecurringPayment(id, req);
      notify.success("Pago programado actualizado", "Los cambios fueron guardados exitosamente.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar pago programado";
      notify.error("Error", msg);
      throw err;
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      await repository.deleteRecurringPayment(id);
      notify.success("Pago recurrente eliminado", "El flujo recurrente fue retirado.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      notify.error("Error", msg);
      throw err;
    }
  };

  const rescheduleRecurring = async (id: string, newDueDate: string) => {
    try {
      await repository.rescheduleRecurringPayment(id, { newDueDate });
      notify.success("Fecha reprogramada", `Nueva fecha de vencimiento: ${newDueDate}`);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al reprogramar";
      notify.error("Error", msg);
      throw err;
    }
  };

  const togglePause = async (id: string, currentStatus: RecurringStatus) => {
    try {
      if (currentStatus === "Active") {
        await repository.pauseRecurringPayment(id);
        notify.info("Flujo pausado", "El recurrente no generará alertas hasta que lo reactives.");
      } else {
        await repository.resumeRecurringPayment(id);
        notify.success("Flujo reactivado", "El recurrente vuelve a estar activo.");
      }
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cambiar estado";
      notify.error("Error", msg);
      throw err;
    }
  };

  const confirmPayment = async (id: string, req: ConfirmRecurringPaymentRequest = {}) => {
    try {
      const res = await repository.confirmRecurringPayment(id, req);
      notify.success("Pago aceptado y asentado", "El movimiento fue registrado en el Libro Diario.");
      await loadData();
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al confirmar pago";
      notify.error("Error", msg);
      throw err;
    }
  };

  return {
    payments,
    filteredPayments,
    upcomingPayments,
    calendarOccurrences,
    activeEventDates,
    summary,
    loading,
    error,
    search,
    setSearch,
    flowTypeFilter,
    setFlowTypeFilter,
    statusFilter,
    setStatusFilter,
    refresh: loadData,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    rescheduleRecurring,
    togglePause,
    confirmPayment,
  };
}
