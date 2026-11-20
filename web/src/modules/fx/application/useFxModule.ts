"use client";

import { useState, useMemo, useCallback } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { RateSnapshotDto } from "../domain/fx.types";
import { FxApiRepository } from "../infrastructure/fx-api.repository";

export function useFxModule(http: IHttpClient | null) {
  const [rate, setRate] = useState<RateSnapshotDto | null>(null);

  const repo = useMemo(
    () => (http ? new FxApiRepository(http) : null),
    [http]
  );

  const refreshRate = useCallback(async () => {
    if (!repo) return;
    const rateData = await repo.getLatestRate("BOB", "USD").catch(() => null);
    setRate(rateData);
  }, [repo]);

  return {
    rate,
    setRate,
    refreshRate,
  };
}
