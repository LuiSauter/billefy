import React from "react";
import { expect, it, vi } from "vitest";
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn,
  useRef: (value: unknown) => ({ current: value }),
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  useState: (value: unknown) => [typeof value === "function" ? value() : value, vi.fn()],
}));
vi.mock("@/shared/lib/notify", () => ({ notify: { error: vi.fn() } }));
import { InvestmentsView } from "./InvestmentsView";
import { RegisterOperationModal } from "./modals/RegisterOperationModal";
import type { InvestmentsController } from "../application/useInvestments";
function find(tree: React.ReactNode): Record<string, unknown> | undefined {
  if (Array.isArray(tree)) return tree.map(find).find(Boolean);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return;
  return tree.type === RegisterOperationModal ? tree.props : find(tree.props.children as React.ReactNode);
}
it("records dividend cash exactly once and never calls the separate legacy operation/disposal path", async () => {
  const controller = { investments: [{ id: "shares", name: "Fixture shares", createdAt: "2027-01-01T00:00:00Z", currency: "BOB", currentValue: 2000, quantity: 20, initialValue: 2000, history: [], kind: "stocks" }],
    recordDividend: vi.fn().mockResolvedValue({ id: "dividend" }), recordCash: vi.fn(), registerOperation: vi.fn() } as unknown as InvestmentsController;
  const refresh = vi.fn().mockRejectedValue(new Error("read offline"));
  const tree = InvestmentsView({ controller, p2pRate: 7, accounts: [], onCashComplete: refresh });
  const submit = find(tree)!.onConfirmOperation as (payload: unknown) => Promise<void>;
  await expect(submit({ investmentId: "shares", type: "dividend", quantity: 0, unitPrice: 0, totalAmount: 40,
    fees: 0, date: "2027-01-20T00:00:00.000Z", linkedAccountId: "bank", totalAmountExact: "40.00", idempotencyKey: "key" })).resolves.toBeUndefined();
  expect(controller.recordDividend).toHaveBeenCalledExactlyOnceWith("shares",
    { totalAmount: "40.00", linkedAccountId: "bank", occurredAt: "2027-01-20T00:00:00.000Z", notes: undefined }, "key");
  expect(controller.registerOperation).not.toHaveBeenCalled();
  expect(controller.recordCash).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalledOnce();
});
