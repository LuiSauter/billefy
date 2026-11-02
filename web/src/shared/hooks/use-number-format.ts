"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { StoredSessionUser } from "@/shared/application/token-storage.contract";
import { formatNumber, NumberGroupingConvention } from "@/shared/lib/number-format";

interface NumberPreferences {
  numberGroupingConvention?: NumberGroupingConvention;
  maximumDecimalPlaces?: number;
}

function storedPreferences(): Required<Pick<NumberPreferences, "numberGroupingConvention" | "maximumDecimalPlaces">> {
  const user = defaultTokenStorage.getUser() as (StoredSessionUser & NumberPreferences) | null;
  return {
    numberGroupingConvention: user?.numberGroupingConvention ?? "es-BO",
    maximumDecimalPlaces: user?.maximumDecimalPlaces ?? 2,
  };
}

export function useNumberFormat() {
  const [preferences, setPreferences] = useState(storedPreferences);
  useEffect(() => {
    setPreferences(storedPreferences());
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<NumberPreferences>).detail;
      setPreferences({
        numberGroupingConvention: detail.numberGroupingConvention ?? "es-BO",
        maximumDecimalPlaces: detail.maximumDecimalPlaces ?? 2,
      });
    };
    window.addEventListener("billefy:number-format-updated", sync);
    return () => window.removeEventListener("billefy:number-format-updated", sync);
  }, []);
  return useCallback(
    (value: string | number | Parameters<typeof formatNumber>[0]) =>
      formatNumber(value, preferences.numberGroupingConvention, preferences.maximumDecimalPlaces),
    [preferences]
  );
}
