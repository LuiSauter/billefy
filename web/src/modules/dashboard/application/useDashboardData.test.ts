import { beforeEach, describe, expect, it, vi } from "vitest";
const refreshLedger = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("react", () => ({ useState: (value: unknown) => [value, vi.fn()], useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn, useEffect: () => {} }));
vi.mock("@/modules/ledger/application/useLedgerModule", () => ({ useLedgerModule: () => ({ refreshLedger, accounts: [], accountsMap: new Map(), transactions: [] }) }));
vi.mock("@/modules/fx/application/useFxModule", () => ({ useFxModule: () => ({ refreshRate: vi.fn(), rate: null }) }));
vi.mock("@/modules/planning/application/usePlanningModule", () => ({ usePlanningModule: () => ({ refreshPlanning: vi.fn() }) }));
vi.mock("@/modules/ingestion/application/useIngestionModule", () => ({ useIngestionModule: () => ({ refreshDrafts: vi.fn(), drafts: [], pendingDrafts: [] }) }));
vi.mock("@/modules/lending/application/useLendingModule", () => ({ useLendingModule: () => ({ refreshLoans: vi.fn(), loans: [] }) }));
vi.mock("@/modules/messaging/application/useMessagingModule", () => ({ useMessagingModule: () => ({}) }));
import { useDashboardData } from "./useDashboardData";
beforeEach(() => refreshLedger.mockClear());
describe("useDashboardData refresh contract", () => {
  it("exposes the ledger refresh so movement writes can refresh accounts and raw transactions", () => {
    expect(useDashboardData("token", "user").refreshLedger).toBe(refreshLedger);
  });
});
