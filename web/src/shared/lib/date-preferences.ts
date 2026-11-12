import { useSyncExternalStore } from "react";

export type DateFormat = "DD/MM/AAAA" | "AAAA-MM-DD" | "MM/DD/AAAA";
export type WeekStartsOn = "lunes" | "domingo";

export interface DatePreferences {
  dateFormat: DateFormat;
  weekStartsOn: WeekStartsOn;
}

const STORAGE_KEY = "billefy_date_preferences";
const DEFAULT_PREFERENCES: DatePreferences = {
  dateFormat: "DD/MM/AAAA",
  weekStartsOn: "lunes",
};

let currentPreferences: DatePreferences = DEFAULT_PREFERENCES;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getStorage(): Storage | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  return localStorage;
}

export function getDatePreferences(): DatePreferences {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          currentPreferences = {
            dateFormat: parsed.dateFormat || DEFAULT_PREFERENCES.dateFormat,
            weekStartsOn: parsed.weekStartsOn || DEFAULT_PREFERENCES.weekStartsOn,
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return currentPreferences;
}

export function setDatePreferences(prefs: Partial<DatePreferences>) {
  currentPreferences = {
    ...currentPreferences,
    ...prefs,
  };
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(currentPreferences));
    } catch {
      // Ignore storage errors
    }
  }
  notifyListeners();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useDatePreferences(): DatePreferences {
  return useSyncExternalStore(
    subscribe,
    getDatePreferences,
    () => DEFAULT_PREFERENCES
  );
}

/** Formats a Date or ISO string according to the active dateFormat preference. */
export function formatDateWithPreferences(
  input: Date | string | number,
  preferences: DatePreferences = currentPreferences
): string {
  const d = typeof input === "object" ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());

  switch (preferences.dateFormat) {
    case "AAAA-MM-DD":
      return `${year}-${month}-${day}`;
    case "MM/DD/AAAA":
      return `${month}/${day}/${year}`;
    case "DD/MM/AAAA":
    default:
      return `${day}/${month}/${year}`;
  }
}
