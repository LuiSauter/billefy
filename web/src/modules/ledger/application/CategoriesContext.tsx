"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import {
  CategoryColorKey,
  CategoryIconKey,
  CreateUserCategoryInput,
  UserCategory,
} from "../domain/category.types";
import { TransactionDirection } from "../domain/ledger.types";

interface CategoriesContextValue {
  categories: UserCategory[];
  getCategoriesByDirection: (direction: TransactionDirection) => UserCategory[];
  findCategory: (idOrName?: string) => UserCategory | undefined;
  createCategory: (input: CreateUserCategoryInput) => UserCategory;
  deleteCategory: (id: string) => void;
  resetCategories: () => void;
}

const CategoriesContext = createContext<CategoriesContextValue>({
  categories: [],
  getCategoriesByDirection: () => [],
  findCategory: () => undefined,
  createCategory: () => {
    throw new Error("CategoriesProvider not mounted");
  },
  deleteCategory: () => {},
  resetCategories: () => {},
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string): boolean {
  return !!value && UUID_REGEX.test(value);
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeDirection(dir?: string): TransactionDirection {
  return dir && dir.toLowerCase() === "income" ? "Income" : "Expense";
}

function getStorageKey(userId?: string) {
  return `billefy_user_categories_v2_${userId || "guest"}`;
}

function getLegacyStorageKey(userId?: string) {
  return `billefy_user_categories_v1_${userId || "guest"}`;
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const storageKey = getStorageKey(user?.id);
  const legacyKey = getLegacyStorageKey(user?.id);
  const [categories, setCategories] = useState<UserCategory[]>([]);

  const httpClient = useMemo(
    () =>
      new FetchHttpClient({
        authToken: token || undefined,
        userId: user?.id,
      }),
    [token, user?.id]
  );

  const saveToLocalStorage = useCallback(
    (list: UserCategory[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch {
        // Ignore storage errors
      }
    },
    [storageKey]
  );

  // 1. Load local cache (including any v1 migration) with stable UUIDs
  useEffect(() => {
    let active = true;

    let initialList: UserCategory[] = [];
    try {
      const rawV2 = localStorage.getItem(storageKey);
      const rawV1 = localStorage.getItem(legacyKey);
      const parsedV2: UserCategory[] = rawV2 ? JSON.parse(rawV2) : [];
      const parsedV1: UserCategory[] = rawV1 ? JSON.parse(rawV1) : [];

      const combined = [
        ...(Array.isArray(parsedV2) ? parsedV2 : []),
        ...(Array.isArray(parsedV1) ? parsedV1 : []),
      ];

      const seenNames = new Set<string>();
      for (const item of combined) {
        if (!item || !item.name) continue;
        const normDir = normalizeDirection(item.direction);
        const dedupeKey = `${normDir}:${item.name.trim().toLowerCase()}`;
        if (seenNames.has(dedupeKey)) continue;
        seenNames.add(dedupeKey);

        initialList.push({
          id: isValidUuid(item.id) ? item.id : generateUuid(),
          name: item.name.trim(),
          direction: normDir,
          iconKey: (item.iconKey || (normDir === "Income" ? "briefcase" : "utensils")) as CategoryIconKey,
          colorKey: (item.colorKey || (normDir === "Income" ? "emerald" : "rose")) as CategoryColorKey,
          createdAt: item.createdAt || new Date().toISOString(),
        });
      }

      saveToLocalStorage(initialList);
      if (rawV1) {
        localStorage.removeItem(legacyKey);
      }
      setCategories(initialList);
    } catch {
      initialList = [];
      setCategories([]);
    }

    if (!isAuthenticated) return;

    (async () => {
      try {
        interface BackendCategoryDto {
          id: string;
          name: string;
          direction: string;
          iconKey: CategoryIconKey;
          colorKey: CategoryColorKey;
          createdAt: string;
        }
        const remoteRaw = await httpClient.get<BackendCategoryDto[]>(
          "/v1/categories"
        );
        if (!active || !Array.isArray(remoteRaw)) return;

        const remoteNormalized: UserCategory[] = remoteRaw.map((r) => ({
          id: r.id,
          name: r.name,
          direction: normalizeDirection(r.direction),
          iconKey: r.iconKey || "sparkles",
          colorKey: r.colorKey || "blue",
          createdAt: r.createdAt,
        }));

        setCategories((currentInMemory) => {
          const remoteById = new Map(remoteNormalized.map((r) => [r.id, r]));
          const remoteByName = new Set(
            remoteNormalized.map(
              (r) => `${r.direction}:${r.name.trim().toLowerCase()}`
            )
          );

          const unsynced = currentInMemory.filter(
            (local) =>
              !remoteById.has(local.id) &&
              !remoteByName.has(
                `${local.direction}:${local.name.trim().toLowerCase()}`
              )
          );

          // Push any unsynced local categories to backend in background
          for (const localCat of unsynced) {
            httpClient
              .post("/v1/categories", {
                id: localCat.id,
                name: localCat.name,
                direction: localCat.direction,
                iconKey: localCat.iconKey,
                colorKey: localCat.colorKey,
              })
              .catch(() => {});
          }

          const merged = [...remoteNormalized, ...unsynced];
          saveToLocalStorage(merged);
          return merged;
        });
      } catch {
        // Keep current in-memory categories if backend is unreachable
      }
    })();

    return () => {
      active = false;
    };
  }, [storageKey, legacyKey, isAuthenticated, httpClient, saveToLocalStorage]);

  const getCategoriesByDirection = useCallback(
    (direction: TransactionDirection) => {
      const target = normalizeDirection(direction);
      return categories.filter((c) => normalizeDirection(c.direction) === target);
    },
    [categories]
  );

  const findCategory = useCallback(
    (idOrName?: string) => {
      if (!idOrName) return undefined;
      const needle = idOrName.trim().toLowerCase();
      return categories.find(
        (c) =>
          c.id.toLowerCase() === needle ||
          c.name.trim().toLowerCase() === needle
      );
    },
    [categories]
  );

  const createCategory = useCallback(
    (input: CreateUserCategoryInput): UserCategory => {
      const trimmedName = input.name.trim();
      const normDir = normalizeDirection(input.direction);

      // If category with same name and direction already exists, return it
      const existing = categories.find(
        (c) =>
          normalizeDirection(c.direction) === normDir &&
          c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        return existing;
      }

      const newCategory: UserCategory = {
        id: generateUuid(),
        name: trimmedName,
        direction: normDir,
        iconKey: input.iconKey,
        colorKey: input.colorKey,
        createdAt: new Date().toISOString(),
      };

      setCategories((prev) => {
        const next = [...prev, newCategory];
        saveToLocalStorage(next);
        return next;
      });

      if (isAuthenticated) {
        httpClient
          .post("/v1/categories", {
            id: newCategory.id,
            name: newCategory.name,
            direction: newCategory.direction,
            iconKey: newCategory.iconKey,
            colorKey: newCategory.colorKey,
          })
          .catch(() => {});
      }

      return newCategory;
    },
    [categories, saveToLocalStorage, isAuthenticated, httpClient]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveToLocalStorage(next);
        return next;
      });

      if (isAuthenticated && isValidUuid(id)) {
        httpClient.delete(`/v1/categories/${id}`).catch(() => {});
      }
    },
    [saveToLocalStorage, isAuthenticated, httpClient]
  );

  const resetCategories = useCallback(() => {
    setCategories([]);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyKey);
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, legacyKey]);

  const contextValue = useMemo(
    () => ({
      categories,
      getCategoriesByDirection,
      findCategory,
      createCategory,
      deleteCategory,
      resetCategories,
    }),
    [
      categories,
      getCategoriesByDirection,
      findCategory,
      createCategory,
      deleteCategory,
      resetCategories,
    ]
  );

  return (
    <CategoriesContext.Provider value={contextValue}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useUserCategories() {
  return useContext(CategoriesContext);
}
