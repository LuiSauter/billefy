import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { CreateSharedGoalModal } from "./CreateSharedGoalModal";
import { ContributeSharedGoalModal } from "./ContributeSharedGoalModal";
import { CreateSharedEventModal } from "./CreateSharedEventModal";
import { InviteWorkspaceMemberModal } from "./InviteWorkspaceMemberModal";
import { DeactivateWorkspaceModal } from "./DeactivateWorkspaceModal";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";
import { goalsFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
  } };
});
describe("Shared workspace modal requests", () => {
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; vi.stubGlobal("React", React); });
  afterEach(() => vi.unstubAllGlobals());
  function setup(component: () => React.ReactNode) {
    const render = () => { hooks.cursor = 0; return component(); };
    const change = (type: typeof Input | typeof MoneyInput | typeof SelectField, index: number, value: string) => {
      const node = viewNodes(render()).filter((node) => node.type === type)[index];
      if (type === MoneyInput) (node.props.onValueChange as (value: string) => void)(value);
      else (node.props.onChange as (event: unknown) => void)({ target: { value } });
    };
    const prepare = () => (viewNodes(render()).find((node) => node.type === WorkspaceMutationDrawer)!.props.prepare as () => () => Promise<unknown>)();
    return { render, change, prepare };
  }
  it("creates a goal in the workspace currency with zero optional commitment", async () => {
    const createGoal = vi.fn().mockResolvedValue(undefined);
    const test = setup(() => CreateSharedGoalModal({ currency: "BOB", createGoal, onClose: vi.fn() }));
    expect(test.prepare).toThrow();
    test.change(Input, 0, " Viaje ");
    test.change(MoneyInput, 0, "100.10");
    test.change(MoneyInput, 1, "0.00");
    await test.prepare()();
    expect(createGoal).toHaveBeenCalledExactlyOnceWith({ title: "Viaje", targetAmount: 100.1, monthlyCommitmentAmount: 0, currency: "BOB", targetDate: null, category: null });
  });
  it("posts a contribution to the selected goal without selecting a different member", async () => {
    const contributeGoal = vi.fn().mockResolvedValue(undefined);
    const test = setup(() => ContributeSharedGoalModal({ goal: goalsFixture[0], contributeGoal, onClose: vi.fn() }));
    test.change(MoneyInput, 0, "0.10");
    await test.prepare()();
    expect(contributeGoal).toHaveBeenCalledExactlyOnceWith("goal", { amount: 0.1, currency: "BOB" });
  });
  it("creates a zero-value budget event with a real responsible member", async () => {
    const createEvent = vi.fn().mockResolvedValue(undefined);
    const test = setup(() => CreateSharedEventModal({ workspace: workspaceFixture, viewerUserId: "viewer", date: "2026-10-31", createEvent, onClose: vi.fn() }));
    test.change(Input, 0, "Revisar presupuesto");
    test.change(SelectField, 0, "BudgetClose");
    test.change(MoneyInput, 0, "0");
    await test.prepare()();
    expect(createEvent).toHaveBeenCalledExactlyOnceWith({ title: "Revisar presupuesto", financialEventType: "BudgetClose", dueDate: "2026-10-31", amount: 0, currency: "BOB", responsibleMemberId: "one", notes: null });
  });
  it("normalizes invitation email and requires the exact workspace name for deactivation", async () => {
    const invite = vi.fn().mockResolvedValue(undefined);
    const invitation = setup(() => InviteWorkspaceMemberModal({ invite, onClose: vi.fn() }));
    invitation.change(Input, 0, " MEMBER@example.test ");
    await invitation.prepare()();
    expect(invite).toHaveBeenCalledExactlyOnceWith({ email: "member@example.test", workspaceRole: "Member" });
    hooks.slots.length = 0;
    const deactivate = vi.fn().mockResolvedValue(undefined);
    const test = setup(() => DeactivateWorkspaceModal({ name: "Casa", deactivate, onClose: vi.fn() }));
    expect(test.prepare).toThrow();
    test.change(Input, 0, "Casa");
    await test.prepare()();
    expect(deactivate).toHaveBeenCalledOnce();
  });
});
