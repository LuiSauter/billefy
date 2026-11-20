"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { PatrimonialAsset, PatrimonialLiability } from "../domain/patrimonio.types";

const STORAGE_KEYS = {
  manualAssets: "billefy_patrimonial_assets_v1",
  manualLiabilities: "billefy_patrimonial_liabilities_v1",
};

type ManualData = {
  manualAssets: PatrimonialAsset[];
  manualLiabilities: PatrimonialLiability[];
};
type Owner = { userId: string | null };

function storageKey(collection: keyof ManualData, userId: string) {
  // The unsuffixed legacy keys have unknown ownership: never read or migrate them.
  return `${STORAGE_KEYS[collection]}_${encodeURIComponent(userId)}`;
}

function readCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function usePatrimonio() {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated && user?.id ? user.id : null;
  const activeOwner = useRef<Owner>({ userId });
  // Invalidate old callbacks during render, not after the hydration effect.
  // A new owner token also invalidates callbacks from an earlier A -> B -> A session.
  if (activeOwner.current.userId !== userId) activeOwner.current = { userId };
  const owner = activeOwner.current;
  const [snapshot, setSnapshot] = useState<ManualData & { owner: Owner | null; loaded: boolean }>({
    owner: null,
    manualAssets: [],
    manualLiabilities: [],
    loaded: false,
  });

  useEffect(() => {
    if (activeOwner.current !== owner) return;
    setSnapshot({
      owner,
      manualAssets: owner.userId
        ? readCollection<PatrimonialAsset>(storageKey("manualAssets", owner.userId))
        : [],
      manualLiabilities: owner.userId
        ? readCollection<PatrimonialLiability>(storageKey("manualLiabilities", owner.userId))
        : [],
      loaded: true,
    });
  }, [owner]);

  const updateCollection = useCallback(
    <K extends keyof ManualData>(collection: K, update: (previous: ManualData[K]) => ManualData[K]) => {
      if (!owner.userId || activeOwner.current !== owner) return;
      const key = storageKey(collection, owner.userId);
      setSnapshot(previous => {
        // Also guard queued updates evaluated after an identity switch.
        if (activeOwner.current !== owner || previous.owner !== owner || !previous.loaded) return previous;
        const next = update(previous[collection]);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage may be unavailable; retain this owner's in-memory changes only.
        }
        return { ...previous, [collection]: next };
      });
    },
    [owner]
  );

  const addAsset = useCallback(
    async (asset: Omit<PatrimonialAsset, "id" | "createdAt">) => {
      const newAsset: PatrimonialAsset = {
        ...asset,
        id: `ast-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updateCollection("manualAssets", previous => [newAsset, ...previous]);
    },
    [updateCollection]
  );

  const deleteAsset = useCallback(async (id: string) => {
    updateCollection("manualAssets", previous => previous.filter(asset => asset.id !== id));
  }, [updateCollection]);

  const addLiability = useCallback(
    async (liability: Omit<PatrimonialLiability, "id" | "createdAt">) => {
      const newLiability: PatrimonialLiability = {
        ...liability,
        id: `liab-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updateCollection("manualLiabilities", previous => [newLiability, ...previous]);
    },
    [updateCollection]
  );

  const deleteLiability = useCallback(async (id: string) => {
    updateCollection("manualLiabilities", previous => previous.filter(liability => liability.id !== id));
  }, [updateCollection]);

  // Never expose the previous owner's snapshot, even on the first render before
  // the new owner's effect runs. Anonymous sessions have no storage namespace.
  const current = snapshot.owner === owner;
  return {
    manualAssets: current && userId ? snapshot.manualAssets : [],
    manualLiabilities: current && userId ? snapshot.manualLiabilities : [],
    addAsset,
    deleteAsset,
    addLiability,
    deleteLiability,
    loaded: current && snapshot.loaded,
  };
}
