import { beforeEach, describe, expect, it, vi } from "vitest";
const hookState = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", () => ({
  useState: (initial: unknown) => { const index = hookState.cursor++; if (!(index in hookState.slots)) hookState.slots[index] = initial; return [hookState.slots[index], (value: unknown) => { hookState.slots[index] = value; }]; },
  useRef: (initial: unknown) => { const index = hookState.cursor++; if (!(index in hookState.slots)) hookState.slots[index] = { current: initial }; return hookState.slots[index]; },
}));
import { useDashboardModals } from "./useDashboardModals";
import type { LoanDetailDto, LoanSummaryDto } from "@/modules/lending/domain/lending.types";
const summary = (id: string, type: "Lent" | "Borrowed" = "Lent"): LoanSummaryDto => ({ id, type, status: "Active", currency: "BOB" } as LoanSummaryDto);
const detail = (id: string, type: "Lent" | "Borrowed" = "Lent"): LoanDetailDto => ({ summary: summary(id, type) } as LoanDetailDto);
function useModalsHook(get: (id: string) => Promise<LoanDetailDto>) { hookState.cursor = 0; return useDashboardModals(get); }
const mount = useModalsHook;
beforeEach(() => { hookState.slots = []; hookState.cursor = 0; });
describe("useDashboardModals authoritative collection context", () => {
  it("uses fetched native-currency detail and carries installment reference", async () => {
    const fetch = vi.fn(async (id: string) => detail(id)); const api = mount(fetch);
    await api.openLoanPayment("fresh", [summary("fresh")], 7);
    const current = mount(fetch);
    expect(current.selectedLoanForPayment?.currency).toBe("BOB");
    expect(current.selectedInstallmentNumber).toBe(7);
    expect(fetch).toHaveBeenCalledWith("fresh");
  });
  it("allows retry after fetch failure and ignores a closed request", async () => {
    let resolve!: (value: LoanDetailDto) => void;
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockImplementationOnce(() => new Promise<LoanDetailDto>(r => { resolve = r; }));
    let api = mount(fetch); await api.openLoanPayment("loan");
    api = mount(fetch); expect(api.paymentError).toBeTruthy();
    void api.retryLoanPayment(); api = mount(fetch); api.closeLoanPayment(); resolve(detail("loan"));
    await Promise.resolve(); api = mount(fetch); expect(api.selectedLoanForPayment).toBeNull();
    expect(api.isLoanPaymentModalOpen).toBe(false);
  });
  it("invalidates in-flight detail when opening empty target or switching loans", async () => {
    const resolvers: ((detail: LoanDetailDto) => void)[] = [];
    const fetch = vi.fn(() => new Promise<LoanDetailDto>(resolve => resolvers.push(resolve)));
    let api = mount(fetch); const first = api.openLoanPayment("first");
    api = mount(fetch); const second = api.openLoanPayment("second");
    api = mount(fetch); await api.openLoanPayment("");
    resolvers[0](detail("first")); resolvers[1](detail("second")); await Promise.all([first, second]);
    api = mount(fetch); expect(api.selectedLoanForPayment).toBeNull();
  });
  it("refreshes only the matching selected loan detail after a saved payment", async () => {
    const refreshed = detail("loan"); refreshed.payments = [{ id: "payment-2" } as never];
    const fetch = vi.fn().mockResolvedValueOnce(detail("loan")).mockResolvedValueOnce(refreshed);
    let api = mount(fetch); await api.openLoanDetail("loan"); api = mount(fetch);
    await api.refreshSelectedLoanDetail("loan"); api = mount(fetch);
    expect(api.selectedLoanDetail?.payments).toHaveLength(1);
  });
  it("does not overwrite a different detail opened during refresh, and tolerates refresh failure", async () => {
    let resolve!: (value: LoanDetailDto) => void;
    const fetch = vi.fn().mockResolvedValueOnce(detail("first"))
      .mockImplementationOnce(() => new Promise<LoanDetailDto>(r => { resolve = r; }))
      .mockResolvedValueOnce(detail("second")).mockRejectedValueOnce(new Error("read failed"));
    let api = mount(fetch); await api.openLoanDetail("first"); api = mount(fetch);
    const refreshing = api.refreshSelectedLoanDetail("first");
    api = mount(fetch); await api.openLoanDetail("second");
    resolve(detail("first")); await refreshing; api = mount(fetch);
    expect(api.selectedLoanDetail?.summary.id).toBe("second");
    await api.refreshSelectedLoanDetail("second");
    api = mount(fetch); expect(api.selectedLoanDetail?.summary.id).toBe("second");
  });
  it.each(["summary", "id"])("fetches Borrowed detail from a %s target, preserving native currency and installment reference", async target => {
    const fetched = detail("debt", "Borrowed"); fetched.summary.currency = "USD";
    const fetch = vi.fn().mockResolvedValue(fetched); const api = mount(fetch);
    await api.openLoanPayment(target === "summary" ? summary("debt", "Borrowed") : "debt", [summary("debt", "Borrowed")], 3);
    const current = mount(fetch);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("debt");
    expect(current.selectedLoanForPayment).toBe(fetched.summary);
    expect(current.selectedLoanForPayment?.currency).toBe("USD");
    expect(current.selectedInstallmentNumber).toBe(3);
    expect(current.paymentLoading).toBe(false);
  });
  it("does not open an inactive Borrowed loan for payment", async () => {
    const fetched = detail("debt", "Borrowed"); fetched.summary.status = "Cancelled";
    const fetch = vi.fn().mockResolvedValue(fetched);
    await mount(fetch).openLoanPayment(summary("debt", "Borrowed"));
    expect(mount(fetch).selectedLoanForPayment).toBeNull();
    expect(mount(fetch).paymentError).toBeTruthy();
  });
});
