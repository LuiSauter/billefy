"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { notify } from "@/shared/lib/notify";
import { CreateInvestmentInput, Investment } from "../domain/investment.types";

export function useInvestments(http: IHttpClient | null) {
  const [investments, setInvestments] = useState<Investment[]>([]);

  const refresh = useCallback(async () => {
    if (!http) return;
    try {
      const data = await http.get<Investment[]>("/v1/planning/investments");
      setInvestments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify.error("No se pudieron cargar las inversiones", err);
    }
  }, [http]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInvestment = useCallback(
    async (input: CreateInvestmentInput) => {
      if (!http) return;
      try {
        await http.post("/v1/planning/investments", {
          ...input,
          name: input.name.trim(),
        });
        await refresh();
      } catch (err) {
        notify.error("No se pudo guardar el activo", err);
      }
    },
    [http, refresh]
  );

  /** Records a new valuation; the server derives the variation from history. */
  const updateInvestmentValue = useCallback(
    async (id: string, newValue: number, quantity?: number) => {
      if (!http) return;
      try {
        await http.put(`/v1/planning/investments/${id}/value`, {
          currentValue: newValue,
          quantity,
        });
        await refresh();
      } catch (err) {
        notify.error("No se pudo actualizar el valor", err);
      }
    },
    [http, refresh]
  );

  const deleteInvestment = useCallback(
    async (id: string) => {
      if (!http) return;
      try {
        await http.delete(`/v1/planning/investments/${id}`);
        await refresh();
      } catch (err) {
        notify.error("No se pudo eliminar el activo", err);
      }
    },
    [http, refresh]
  );

  return useMemo(
    () => ({ investments, createInvestment, updateInvestmentValue, deleteInvestment }),
    [investments, createInvestment, updateInvestmentValue, deleteInvestment]
  );
}

export type InvestmentsController = ReturnType<typeof useInvestments>;
