import { describe, expect, it } from "vitest";
import type { WorkspaceMemberDto } from "../domain/workspaces.types";
import { buildIncomeRequest, initialIncomeDraft } from "./workspace-income";

const members: WorkspaceMemberDto[] = [
  { id: "one", userId: "viewer", workspaceRole: "Owner", incomeSharePercentage: 60, joinedAt: "2026-01-01", isActive: true },
  { id: "two", userId: "other", workspaceRole: "Member", incomeSharePercentage: 40, joinedAt: "2026-01-01", isActive: true },
  { id: "three", userId: "removed", workspaceRole: "Member", incomeSharePercentage: 0, joinedAt: "2026-01-01", isActive: false },
];

describe("initialIncomeDraft", () => {
  it("defaults the receiver to the viewer when active", () => {
    expect(initialIncomeDraft(members, "other").receivedByMemberId).toBe("two");
  });
  it("falls back to the first active member when the viewer is not one", () => {
    expect(initialIncomeDraft(members, "unknown").receivedByMemberId).toBe("one");
  });
});

describe("buildIncomeRequest", () => {
  const draft = { description: "Salario", categoryId: "salary", date: "2026-11-01", amount: "1500.50", receivedByMemberId: "one", notes: "" };

  it("builds a valid request trimming description and notes", () => {
    const request = buildIncomeRequest({ ...draft, description: " Salario ", notes: " neto " }, members, "USD");
    expect(request).toEqual({ description: "Salario", amount: 1500.5, currency: "USD", receivedByMemberId: "one", date: "2026-11-01", categoryId: "salary", notes: "neto" });
  });

  it("sends null notes when left blank", () => {
    expect(buildIncomeRequest(draft, members, "USD").notes).toBeNull();
  });

  it("rejects an inactive receiver", () => {
    expect(() => buildIncomeRequest({ ...draft, receivedByMemberId: "three" }, members, "USD")).toThrow("integrante activo");
  });

  it("rejects a missing category", () => {
    expect(() => buildIncomeRequest({ ...draft, categoryId: "" }, members, "USD")).toThrow("categoría");
  });

  it("rejects an invalid date", () => {
    expect(() => buildIncomeRequest({ ...draft, date: "2026-13-01" }, members, "USD")).toThrow("fecha válida");
  });

  it("rejects a non-positive amount", () => {
    expect(() => buildIncomeRequest({ ...draft, amount: "0" }, members, "USD")).toThrow("monto debe ser positivo");
  });

  it("rejects notes over 300 characters", () => {
    expect(() => buildIncomeRequest({ ...draft, notes: "x".repeat(301) }, members, "USD")).toThrow("300 caracteres");
  });
});
