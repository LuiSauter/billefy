"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { notify } from "@/shared/lib/notify";
import {
  DEFAULT_PLAN,
  DistributionPlan,
  PlanBucket,
} from "../domain/distribution-plan";

const SAVE_DEBOUNCE_MS = 500;

interface PlanDto {
  enabled: boolean;
  buckets: PlanBucket[];
}

export function useDistributionPlan(http: IHttpClient | null) {
  const [plan, setPlan] = useState<DistributionPlan>(DEFAULT_PLAN);
  const latest = useRef<DistributionPlan>(DEFAULT_PLAN);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!http) return;
    try {
      const dto = await http.get<PlanDto>("/v1/planning/distribution-plan");
      const next: DistributionPlan = {
        enabled: !!dto.enabled,
        buckets: Array.isArray(dto.buckets) ? dto.buckets : [],
      };
      latest.current = next;
      setPlan(next);
    } catch (err) {
      notify.error("No se pudo cargar el plan de distribución", err);
    }
  }, [http]);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const persist = useCallback(async () => {
    if (!http) return;
    try {
      await http.put("/v1/planning/distribution-plan", latest.current);
    } catch (err) {
      notify.error("No se pudo guardar el plan", err);
      await load();
    }
  }, [http, load]);

  const apply = useCallback(
    (next: DistributionPlan, immediate: boolean) => {
      latest.current = next;
      setPlan(next);
      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        void persist();
      } else {
        timer.current = setTimeout(() => void persist(), SAVE_DEBOUNCE_MS);
      }
    },
    [persist]
  );

  const setEnabled = useCallback(
    (enabled: boolean) => apply({ ...latest.current, enabled }, true),
    [apply]
  );

  const setBuckets = useCallback(
    (buckets: PlanBucket[]) => apply({ ...latest.current, buckets }, false),
    [apply]
  );

  return useMemo(() => ({ plan, setEnabled, setBuckets }), [plan, setEnabled, setBuckets]);
}

export type DistributionPlanController = ReturnType<typeof useDistributionPlan>;
