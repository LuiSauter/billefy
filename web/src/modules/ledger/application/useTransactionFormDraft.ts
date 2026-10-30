"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { TransactionDirection } from "../domain/ledger.types";

export interface TransactionFormDraftState {
  step: 1 | 2 | 3;
  direction: TransactionDirection;
  title: string;
  selectedCategoryId: string;
  amount: string;
  accountId: string;
  useNow: boolean;
  customDate: string;
  customTime: string;
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTimeToIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const constructed = new Date(
    y,
    m - 1,
    d,
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    0
  );
  return isNaN(constructed.getTime())
    ? new Date().toISOString()
    : constructed.toISOString();
}

function createDefaultDraft(defaultAccountId: string): TransactionFormDraftState {
  const now = new Date();
  return {
    step: 1,
    direction: "Expense",
    title: "",
    selectedCategoryId: "",
    amount: "",
    accountId: defaultAccountId,
    useNow: true,
    customDate: getLocalDateString(now),
    customTime: getLocalTimeString(now),
  };
}

function getDraftStorageKey(userId?: string) {
  return `billefy_txn_form_draft_v2_${userId || "guest"}`;
}

function parseSavedDraft(
  raw: string | null,
  defaultAccountId: string
): TransactionFormDraftState {
  const fallback = createDefaultDraft(defaultAccountId);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<
      TransactionFormDraftState & { description?: string }
    >;
    const step =
      parsed.step === 1 || parsed.step === 2 || parsed.step === 3
        ? parsed.step
        : 1;
    return {
      step,
      direction:
        parsed.direction === "Income" || parsed.direction === "Expense"
          ? parsed.direction
          : "Expense",
      title: parsed.title ?? parsed.description ?? "",
      selectedCategoryId: parsed.selectedCategoryId || "",
      amount: parsed.amount || "",
      accountId: parsed.accountId || defaultAccountId,
      useNow: typeof parsed.useNow === "boolean" ? parsed.useNow : true,
      customDate: parsed.customDate || fallback.customDate,
      customTime: parsed.customTime || fallback.customTime,
    };
  } catch {
    return fallback;
  }
}

export function useTransactionFormDraft(defaultAccountId: string) {
  const { user } = useAuth();
  const storageKey = getDraftStorageKey(user?.id);

  const [draft, setDraft] = useState<TransactionFormDraftState>(() => {
    if (typeof window === "undefined") {
      return createDefaultDraft(defaultAccountId);
    }
    return parseSavedDraft(localStorage.getItem(storageKey), defaultAccountId);
  });

  // Re-load if user changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDraft(parseSavedDraft(localStorage.getItem(storageKey), defaultAccountId));
  }, [storageKey, defaultAccountId]);

  const updateDraft = useCallback(
    (patch: Partial<TransactionFormDraftState>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage write errors
        }
        return next;
      });
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    const reset = createDefaultDraft(defaultAccountId);
    setDraft(reset);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey, defaultAccountId]);

  const hasUnsavedChanges =
    draft.title.trim() !== "" ||
    draft.amount.trim() !== "" ||
    draft.selectedCategoryId !== "" ||
    !draft.useNow;

  return {
    draft,
    updateDraft,
    clearDraft,
    hasUnsavedChanges,
  };
}
