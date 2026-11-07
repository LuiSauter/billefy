"use client";

import { useState, useEffect, useCallback } from "react";
import { PatrimonialAsset, PatrimonialLiability } from "../domain/patrimonio.types";

const ASSETS_STORAGE_KEY = "billefy_patrimonial_assets_v1";
const LIABILITIES_STORAGE_KEY = "billefy_patrimonial_liabilities_v1";

export function usePatrimonio() {
  const [manualAssets, setManualAssets] = useState<PatrimonialAsset[]>([]);
  const [manualLiabilities, setManualLiabilities] = useState<PatrimonialLiability[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const storedAssets = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (storedAssets) {
        const parsed = JSON.parse(storedAssets);
        if (Array.isArray(parsed)) setManualAssets(parsed);
      }

      const storedLiabilities = localStorage.getItem(LIABILITIES_STORAGE_KEY);
      if (storedLiabilities) {
        const parsed = JSON.parse(storedLiabilities);
        if (Array.isArray(parsed)) setManualLiabilities(parsed);
      }
    } catch {
      // Ignore parse errors
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save assets on change
  const addAsset = useCallback(
    async (asset: Omit<PatrimonialAsset, "id" | "createdAt">) => {
      const newAsset: PatrimonialAsset = {
        ...asset,
        id: `ast-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setManualAssets((prev) => {
        const next = [newAsset, ...prev];
        try {
          localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const deleteAsset = useCallback(async (id: string) => {
    setManualAssets((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Save liabilities on change
  const addLiability = useCallback(
    async (liability: Omit<PatrimonialLiability, "id" | "createdAt">) => {
      const newLiab: PatrimonialLiability = {
        ...liability,
        id: `liab-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setManualLiabilities((prev) => {
        const next = [newLiab, ...prev];
        try {
          localStorage.setItem(LIABILITIES_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const deleteLiability = useCallback(async (id: string) => {
    setManualLiabilities((prev) => {
      const next = prev.filter((l) => l.id !== id);
      try {
        localStorage.setItem(LIABILITIES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return {
    manualAssets,
    manualLiabilities,
    addAsset,
    deleteAsset,
    addLiability,
    deleteLiability,
    loaded,
  };
}
