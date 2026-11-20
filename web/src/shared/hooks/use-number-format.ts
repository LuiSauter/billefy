"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_NUMBER_FORMAT_PREFERENCES, formatNumber, getNumberFormatPreferences, subscribeNumberFormatPreferences } from "@/shared/lib/number-format";

export function useNumberPreferences() {
  return useSyncExternalStore(subscribeNumberFormatPreferences, getNumberFormatPreferences, () => DEFAULT_NUMBER_FORMAT_PREFERENCES);
}
export function useNumberFormat() {
  const preferences = useNumberPreferences();
  return useCallback((value: string | number | Parameters<typeof formatNumber>[0]) =>
    formatNumber(value, preferences.convention, preferences.decimalPlaces), [preferences]);
}
