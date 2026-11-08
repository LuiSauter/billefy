import { describe, expect, it, vi } from "vitest";
import { createWorkspaceDraft, localCalendarDate, saveWorkspaceDraft, validateWorkspaceDraft, workspaceContributionPreview } from "./workspace-creation";

function services() {
  return {
    createWorkspace: vi.fn().mockResolvedValue({ id: "created" }),
    updateSettings: vi.fn().mockResolvedValue(undefined),
    inviteMember: vi.fn().mockResolvedValue({ id: "invitation" }),
    getSplitConfiguration: vi.fn().mockResolvedValue({ defaultSplitRule: "EqualParts", effectiveSplitRule: "EqualParts", isSplitConfigurationReady: true,
      activeMembers: [{ memberId: "owner", incomeSharePercentage: 100, customSharePercentage: 100, responsibilityWeight: 1 }], pendingInvitations: [] }),
    updateSplitConfiguration: vi.fn().mockResolvedValue({}),
    getWorkspace: vi.fn().mockResolvedValue({ id: "created", createdBy: "owner-user", members: [{ id: "owner", userId: "owner-user", workspaceRole: "Owner", incomeSharePercentage: 100, joinedAt: "2026-01-01", isActive: true }] }),
    setBudget: vi.fn().mockResolvedValue({}),
    deactivateWorkspace: vi.fn().mockResolvedValue(undefined),
  };
}

const input = () => ({ ...createWorkspaceDraft(), name: "Hogar", emails: ["person@example.test"] });

describe("workspace creation share vectors", () => {
  it("builds local calendar dates without UTC conversion and defaults new drafts locally", () => {
    const localMidnight = new Date(2026, 0, 2, 0, 15);
    expect(localCalendarDate(localMidnight)).toBe("2026-01-02");
    expect(createWorkspaceDraft().startDate).toBe(localCalendarDate());
  });
  it("rejects impossible planned start dates before any API write and sends valid dates", async () => {
    const invalid = { ...input(), startDate: "2026-02-30" };
    expect(validateWorkspaceDraft(invalid)).toContain("fecha");
    const blocked = services();
    await expect(saveWorkspaceDraft(invalid, blocked, null, () => {})).rejects.toThrow("fecha");
    expect(blocked.createWorkspace).not.toHaveBeenCalled();

    const valid = { ...input(), startDate: "2028-02-29" };
    const api = services();
    await saveWorkspaceDraft(valid, api, null, () => {});
    expect(api.createWorkspace).toHaveBeenCalledWith(expect.objectContaining({ startDate: "2028-02-29" }));
  });

  it.each([".", "abc", "-1", "101", "Infinity", "1.1234567"]) (
    "keeps invalid owner income input %s safe in preview and blocks every write",
    async (value) => {
      const draft = { ...input(), ownerIncomeSharePercentage: value };
      expect(() => workspaceContributionPreview(draft)).not.toThrow();
      expect(validateWorkspaceDraft(draft)).toBeTruthy();
      const api = services();
      await expect(saveWorkspaceDraft(draft, api, null, () => {})).rejects.toThrow();
      expect(api.createWorkspace).not.toHaveBeenCalled();
      expect(api.inviteMember).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["EqualParts", "incomeSharePercentage", "101"],
    ["EqualParts", "customSharePercentage", "1.1234567"],
    ["IncomeProportional", "customSharePercentage", "101"],
    ["CustomPercentage", "incomeSharePercentage", "-0.1"],
    ["EqualParts", "responsibilityWeight", "100000000000000"],
    ["EqualParts", "responsibilityWeight", "1.0000001"],
  ] as const)("rejects invalid persisted unselected field %s %s", async (splitRule, field, value) => {
    const draft = input();
    draft.splitRule = splitRule;
    draft.invitationShares = { "person@example.test": { [field]: value } };
    expect(validateWorkspaceDraft(draft)).toBeTruthy();
    const api = services();
    await expect(saveWorkspaceDraft(draft, api, null, () => {})).rejects.toThrow();
    expect(api.createWorkspace).not.toHaveBeenCalled();
  });

  it("rejects over-precision and out-of-range owner custom fields before POST even under EqualParts", () => {
    for (const value of ["100.0000001", "-1", "NaN"]) {
      const draft = { ...input(), ownerCustomSharePercentage: value };
      expect(validateWorkspaceDraft(draft)).toBeTruthy();
    }
  });
});
