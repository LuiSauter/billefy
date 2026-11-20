"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { notify } from "@/shared/lib/notify";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import {
  DEFAULT_PLAN,
  DistributionPlan,
  PlanBucket,
  validatePlan,
} from "../domain/distribution-plan";

import { createPlanPersistence } from "./distribution-plan-persistence";
import { createPlanLoadGuard, nextPlanLoadStatus, PlanLoadStatus } from "./distribution-plan-load";

interface PlanDto {
  enabled: boolean;
  buckets: PlanBucket[];
}

export function useDistributionPlan(http: IHttpClient | null) {
  const [plan, setPlan] = useState<DistributionPlan>(DEFAULT_PLAN);
  const [loadStatus, setLoadStatus] = useState<PlanLoadStatus>("loading");
  const loadGuard = useMemo(() => createPlanLoadGuard(), []);
  const { categories } = useUserCategories();
  const expenseCategoryIds = useMemo(() => categories.filter((c) => c.direction === "Expense").map((c) => c.id), [categories]);
  const validationErrors = useMemo(() => validatePlan(plan.buckets, expenseCategoryIds), [plan.buckets, expenseCategoryIds]);
  const latest = useRef<DistributionPlan>(DEFAULT_PLAN);
  const httpRef = useRef(http);
  useEffect(() => { httpRef.current = http; }, [http]);
  const persistence = useMemo(() => createPlanPersistence({
    save: async (snapshot) => {
      if (httpRef.current) await httpRef.current.put("/v1/planning/distribution-plan", snapshot);
    },
    onError: (err, snapshot) => notify.error(
      snapshot.enabled
        ? "No se pudo guardar o activar el plan; tus cambios siguen disponibles para corregirlos"
        : "No se pudo guardar el plan; tus cambios siguen disponibles para corregirlos",
      err,
    ),
  }), []);

  const load = useCallback(async () => {
    if (!http) return;
    const token = loadGuard.begin();
    try {
      const dto = await http.get<PlanDto>("/v1/planning/distribution-plan");
      // Ignore late reads superseded by a newer read, a client switch or a local edit.
      if (!loadGuard.isCurrent(token)) return;
      const next: DistributionPlan = {
        enabled: !!dto.enabled,
        buckets: Array.isArray(dto.buckets) ? dto.buckets : [],
      };
      latest.current = next;
      setPlan(next);
      setLoadStatus((s) => nextPlanLoadStatus(s, true));
    } catch (err) {
      if (!loadGuard.isCurrent(token)) return;
      setLoadStatus((s) => nextPlanLoadStatus(s, false));
      notify.error("No se pudo cargar el plan de distribución", err);
    }
  }, [http, loadGuard]);

  useEffect(() => {
    void load();
    return () => {
      loadGuard.invalidate();
      persistence.cancelPending();
    };
  }, [load, loadGuard, persistence]);

  const persist = useCallback((immediate: boolean) => {
    persistence.cancelPending();
    if (!http) return;
    if (latest.current.enabled && validatePlan(latest.current.buckets, expenseCategoryIds).length) return;
    persistence.schedule(latest.current, immediate);
  }, [http, expenseCategoryIds, persistence]);

  const apply = useCallback(
    (next: DistributionPlan, immediate: boolean) => {
      loadGuard.markLocalEdit();
      latest.current = next;
      setPlan(next);
      setLoadStatus("loaded");
      persist(immediate);
    },
    [persist, loadGuard]
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled && validatePlan(latest.current.buckets, expenseCategoryIds).length) {
        notify.error("Configurá el plan antes de activarlo", validatePlan(latest.current.buckets, expenseCategoryIds).join(" "));
        return false;
      }
      apply({ ...latest.current, enabled }, true);
      return true;
    },
    [apply, expenseCategoryIds]
  );

  const setBuckets = useCallback(
    (buckets: PlanBucket[]) => apply({ ...latest.current, buckets }, false),
    [apply]
  );

  const reloadPlan = useCallback(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ plan, setEnabled, setBuckets, validationErrors, loadStatus, reloadPlan }),
    [plan, setEnabled, setBuckets, validationErrors, loadStatus, reloadPlan]
  );
}

export type DistributionPlanController = ReturnType<typeof useDistributionPlan>;
