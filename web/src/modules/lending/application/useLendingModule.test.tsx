import { beforeEach, describe, expect, it, vi } from "vitest";
const { post, getLoans, warn } = vi.hoisted(() => ({ post: vi.fn(), getLoans: vi.fn(), warn: vi.fn() }));
vi.mock("react", () => ({ useState: (value: unknown) => [value, vi.fn()], useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn }));
vi.mock("../infrastructure/lending-api.repository", () => ({ LendingApiRepository: class { registerLoanPayment = post; getLoans = getLoans; } }));
vi.mock("@/shared/lib/notify", () => ({ notify: { error: warn } }));
import { useLendingModule } from "./useLendingModule";
const http = {} as never;
beforeEach(() => { post.mockReset(); getLoans.mockReset(); warn.mockReset(); });
describe("useLendingModule payment write boundary", () => {
  it("returns saved result and warns if refresh throws synchronously", async () => {
    const saved = { paymentId: "p1" };
    post.mockResolvedValue(saved); getLoans.mockRejectedValue(new Error("read failed"));
    const api = useLendingModule(http, () => { throw new Error("refresh failed"); });
    await expect(api.registerLoanPayment("loan", { amount: 1 })).resolves.toBe(saved);
    expect(post).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("Cobro guardado", expect.stringContaining("actualizar"));
  });
  it("does not refresh or report success when POST fails", async () => {
    post.mockRejectedValue(new Error("write failed"));
    const api = useLendingModule(http, vi.fn());
    await expect(api.registerLoanPayment("loan", { amount: 1 })).rejects.toThrow("write failed");
    expect(getLoans).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  });
  it("rejects rather than claiming success when the repository is unavailable", async () => {
    const api = useLendingModule(null);
    await expect(api.registerLoanPayment("loan", { amount: 1 })).rejects.toThrow("Cliente no inicializado");
    expect(post).not.toHaveBeenCalled();
  });
});
