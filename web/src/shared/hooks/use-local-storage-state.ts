"use client";

import { useCallback, useEffect, useState } from "react";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function readPersistedState<T>(key: string, fallback: T, storage?: StorageLike): T {
  const target = resolveStorage(storage);
  if (!target) return fallback;
  try {
    const raw = target.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersistedState<T>(key: string, value: T, storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (quota, privacy mode) — the in-memory value still applies.
  }
}

/** Persists state to localStorage under `key`, hydrating from it on mount (SSR-safe: starts at `fallback`, syncs after mount). */
export function useLocalStorageState<T>(key: string, fallback: T, storage?: StorageLike) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(readPersistedState(key, fallback, storage));
    // Only re-read when the storage key changes, not when `fallback`/`storage` identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setPersisted = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        writePersistedState(key, resolved, storage);
        return resolved;
      });
    },
    [key, storage]
  );

  return [value, setPersisted] as const;
}
