import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatrimonialAsset, PatrimonialLiability } from "../domain/patrimonio.types";

const auth = vi.hoisted(() => ({
  user: { id: "user-A", fullName: "First name" } as { id: string; fullName: string } | null,
  isAuthenticated: true,
}));
vi.mock("@/modules/identity/application/AuthContext", () => ({ useAuth: () => auth }));

// The existing node-only Vitest harness has no DOM renderer. Model hook renders
// and commit effects separately so assertions also see the pre-effect projection.
let slots: unknown[] = [];
let cursor = 0;
let pendingEffects: (() => void)[] = [];
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => {
      slots[index] = typeof value === "function" ? value(slots[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useEffect: (callback: () => void, dependencies: unknown[]) => {
    const index = cursor++;
    const previous = slots[index] as unknown[] | undefined;
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
      pendingEffects.push(callback);
    }
    slots[index] = dependencies;
  },
  useCallback: (callback: unknown) => callback,
}));
import { usePatrimonio } from "./usePatrimonio";

type Projection = ReturnType<typeof usePatrimonio>;
const asset: Omit<PatrimonialAsset, "id" | "createdAt"> = {
  name: "Synthetic vehicle", category: "vehicles", value: 125, currency: "BOB",
};
const liability: Omit<PatrimonialLiability, "id" | "createdAt"> = {
  name: "Synthetic debt", category: "loan", amount: 25, currency: "BOB",
};
const legacyAssets = "billefy_patrimonial_assets_v1";
const legacyLiabilities = "billefy_patrimonial_liabilities_v1";
let records: Map<string, string>;
const storage = {
  getItem: vi.fn((key: string): string | null => records.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { records.set(key, value); }),
  removeItem: vi.fn((key: string) => { records.delete(key); }),
  clear: vi.fn(() => { records.clear(); }),
};
function render() {
  cursor = 0;
  return PatrimonioHarness();
}
function PatrimonioHarness() {
  return usePatrimonio();
}
function commit() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach(effect => effect());
}
function settled() {
  render();
  commit();
  return render();
}
function identity(id: string | null, authenticated = id !== null) {
  auth.user = id === null ? null : { id, fullName: "Same display name" };
  auth.isAuthenticated = authenticated;
}
function remount() { slots = []; pendingEffects = []; return settled(); }
function expectEmpty(value: Projection) {
  expect(value.manualAssets).toEqual([]);
  expect(value.manualLiabilities).toEqual([]);
}
async function addBoth(value: Projection, name: string) {
  await value.addAsset({ ...asset, name: `${name} asset` });
  await value.addLiability({ ...liability, name: `${name} liability` });
  return render();
}
async function invokeAll(value: Projection, id = "not-owned") {
  await addBoth(value, "Rejected");
  await value.deleteAsset(id);
  await value.deleteLiability(id);
}

beforeEach(() => {
  slots = []; pendingEffects = []; cursor = 0;
  records = new Map();
  storage.getItem.mockReset().mockImplementation(key => records.get(key) ?? null);
  storage.setItem.mockReset().mockImplementation((key, value) => { records.set(key, value); });
  storage.removeItem.mockClear(); storage.clear.mockClear();
  vi.stubGlobal("localStorage", storage);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2027-01-01T12:00:00Z"));
  identity("user-A");
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("usePatrimonio identity isolation", () => {
  it("isolates both collections through A -> B -> logout -> A and restores only the owner's persisted data", async () => {
    const a = await addBoth(settled(), "A");
    const aRecords = new Map(records);
    expect(a.manualAssets).toHaveLength(1);
    expect(a.manualLiabilities).toHaveLength(1);
    expect(aRecords.size).toBe(2);

    identity("user-B");
    expectEmpty(render());
    commit();
    expectEmpty(render());
    const b = await addBoth(render(), "B");
    expect(b.manualAssets.map(item => item.name)).toEqual(["B asset"]);
    expect(b.manualLiabilities.map(item => item.name)).toEqual(["B liability"]);
    for (const [key, value] of aRecords) expect(records.get(key)).toBe(value);
    expect(records.size).toBe(4);

    identity(null);
    expectEmpty(render());
    const anonymous = settled();
    expectEmpty(anonymous);
    const beforeAnonymous = new Map(records);
    storage.getItem.mockClear(); storage.setItem.mockClear();
    await invokeAll(anonymous);
    expect(records).toEqual(beforeAnonymous);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();

    identity("user-A");
    expectEmpty(render());
    commit();
    const restored = render();
    expect(restored.manualAssets).toEqual(a.manualAssets);
    expect(restored.manualLiabilities).toEqual(a.manualLiabilities);
    expect(restored.loaded).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(records).toEqual(beforeAnonymous);
  });

  it("never reads, copies, assigns, rewrites or deletes ambiguous legacy bytes", async () => {
    const oldAssets = '  [{"id":"legacy-asset","name":"Unknown owner","value":178500}]  ';
    const oldLiabilities = ' [{"id":"legacy-liability","amount":700}] ';
    records.set(legacyAssets, oldAssets);
    records.set(legacyLiabilities, oldLiabilities);
    expectEmpty(settled());
    const current = await addBoth(render(), "New");
    await current.deleteAsset(current.manualAssets[0].id);
    await current.deleteLiability(current.manualLiabilities[0].id);
    identity("user-B"); expectEmpty(settled());
    identity(null); expectEmpty(settled());
    expect(storage.getItem.mock.calls.map(([key]) => key)).not.toContain(legacyAssets);
    expect(storage.getItem.mock.calls.map(([key]) => key)).not.toContain(legacyLiabilities);
    expect(storage.setItem.mock.calls.map(([key]) => key)).not.toContain(legacyAssets);
    expect(storage.setItem.mock.calls.map(([key]) => key)).not.toContain(legacyLiabilities);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
    expect(records.get(legacyAssets)).toBe(oldAssets);
    expect(records.get(legacyLiabilities)).toBe(oldLiabilities);
    expect([...records.values()].filter(value => value === oldAssets || value === oldLiabilities)).toHaveLength(2);
  });

  it("rejects old callbacks before effects and after loading B without changing either owner's data", async () => {
    const a = await addBoth(settled(), "A");
    identity("user-B");
    const immediateB = render();
    expectEmpty(immediateB);
    expect(immediateB.loaded).toBe(false);
    let saved = new Map(records);
    storage.setItem.mockClear();
    await invokeAll(a, a.manualAssets[0].id);
    await invokeAll(immediateB);
    expectEmpty(render());
    expect(records).toEqual(saved);
    expect(storage.setItem).not.toHaveBeenCalled();
    commit();
    const b = await addBoth(render(), "B");
    saved = new Map(records);
    storage.setItem.mockClear();
    await invokeAll(a, b.manualAssets[0].id);
    await a.deleteLiability(b.manualLiabilities[0].id);
    expect(render().manualAssets).toEqual(b.manualAssets);
    expect(render().manualLiabilities).toEqual(b.manualLiabilities);
    expect(records).toEqual(saved);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("keeps same-user add, newest-first ordering, delete and reload persistence despite profile changes", async () => {
    const first = await addBoth(settled(), "First");
    vi.advanceTimersByTime(1);
    const second = await addBoth(first, "Second");
    expect(second.manualAssets.map(item => item.name)).toEqual(["Second asset", "First asset"]);
    expect(second.manualLiabilities.map(item => item.name)).toEqual(["Second liability", "First liability"]);
    expect(second.manualAssets[0]).toMatchObject({ ...asset, name: "Second asset", createdAt: "2027-01-01T12:00:00.001Z" });
    expect(second.manualAssets[0].id).toBeTruthy();
    expect(second.manualLiabilities[0].id).toBeTruthy();
    auth.user = { id: "user-A", fullName: "Changed display name" };
    expect(render().manualAssets).toEqual(second.manualAssets);
    expect(render().manualLiabilities).toEqual(second.manualLiabilities);
    expect(remount().manualAssets).toEqual(second.manualAssets);
    expect(render().manualLiabilities).toEqual(second.manualLiabilities);
    await render().deleteAsset(first.manualAssets[0].id);
    await render().deleteLiability(first.manualLiabilities[0].id);
    const reloaded = remount();
    expect(reloaded.manualAssets).toEqual([second.manualAssets[0]]);
    expect(reloaded.manualLiabilities).toEqual([second.manualLiabilities[0]]);
  });

  it.each(["missing user", "unauthenticated user", "missing stable id"])("exposes empty data and never persists with %s", async scenario => {
    const a = await addBoth(settled(), "A");
    if (scenario === "missing user") identity(null);
    if (scenario === "unauthenticated user") identity("user-A", false);
    if (scenario === "missing stable id") identity("");
    storage.getItem.mockClear(); storage.setItem.mockClear();
    const saved = new Map(records);
    expectEmpty(render());
    const anonymous = settled();
    expectEmpty(anonymous);
    expect(anonymous.loaded).toBe(true);
    await invokeAll(anonymous);
    await invokeAll(a);
    expectEmpty(render());
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(records).toEqual(saved);
  });

  it("keeps read/write failures confined to the current identity, with safe memory-only mutations", async () => {
    const a = await addBoth(settled(), "A");
    const saved = new Map(records);
    identity("user-B");
    storage.getItem.mockImplementation(() => { throw new Error("Storage denied"); });
    expectEmpty(render());
    commit();
    const b = render();
    expectEmpty(b);
    expect(b.loaded).toBe(true);
    storage.setItem.mockImplementation(() => { throw new Error("Quota exceeded"); });
    const memoryOnly = await addBoth(b, "B");
    expect(memoryOnly.manualAssets.map(item => item.name)).toEqual(["B asset"]);
    expect(memoryOnly.manualLiabilities.map(item => item.name)).toEqual(["B liability"]);
    await memoryOnly.deleteAsset(memoryOnly.manualAssets[0].id);
    await memoryOnly.deleteLiability(memoryOnly.manualLiabilities[0].id);
    expectEmpty(render());
    expect(records).toEqual(saved);
    storage.getItem.mockImplementation(key => records.get(key) ?? null);
    identity("user-A");
    expectEmpty(render());
    commit();
    expect(render().manualAssets).toEqual(a.manualAssets);
    expect(render().manualLiabilities).toEqual(a.manualLiabilities);
  });

  it("handles malformed or non-array scoped storage independently without falling back to legacy", async () => {
    await addBoth(settled(), "A");
    for (const [key, value] of records) {
      records.set(key, value.includes("A asset") ? "{invalid" : '{"not":"an array"}');
    }
    const saved = new Map(records);
    expectEmpty(remount());
    expect(render().loaded).toBe(true);
    expect(records).toEqual(saved);
    expect(storage.getItem.mock.calls.map(([key]) => key)).not.toContain(legacyAssets);
    expect(storage.getItem.mock.calls.map(([key]) => key)).not.toContain(legacyLiabilities);
  });
});
