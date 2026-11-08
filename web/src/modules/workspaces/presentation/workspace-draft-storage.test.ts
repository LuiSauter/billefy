import { describe, expect, it } from "vitest";
import { getBrowserDraftStorage, markWorkspaceDraftConsumed, readWorkspaceDraft, writeWorkspaceDraft, removeWorkspaceDraft } from "./workspace-draft-storage";
import { createWorkspaceDraft } from "./workspace-creation";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, values };
}

describe("workspace pre-creation draft storage", () => {
  it("isolates user/version keys and validates payload identity before restoring", () => {
    const storage = memoryStorage();
    const draft = { ...createWorkspaceDraft(), name: "Local only" };
    expect(writeWorkspaceDraft(storage, "user-a", draft, 1)).toBe(true);
    expect(readWorkspaceDraft(storage, "user-b", 1).draft).toBeNull();
    expect(readWorkspaceDraft(storage, "user-a", 1).draft?.name).toBe("Local only");
    const key = [...storage.values.keys()][0];
    storage.values.set(key, JSON.stringify({ version: 1, userId: "user-b", draft }));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft).toBeNull();
  });
  it("defaults legacy missing planned dates to local today and rejects malformed present dates", () => {
    const storage = memoryStorage();
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    const key = [...storage.values.keys()][0];
    const record = JSON.parse(storage.values.get(key)!) as { draft: Record<string, unknown> };
    delete record.draft.startDate;
    storage.values.set(key, JSON.stringify(record));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft?.startDate).toBe(createWorkspaceDraft().startDate);
    for (const startDate of [null, 42, "2026-02-30", "2026-2-3"]) {
      record.draft.startDate = startDate;
      storage.values.set(key, JSON.stringify(record));
      expect(readWorkspaceDraft(storage, "user-a", 1).draft).toBeNull();
    }
    record.draft.startDate = "";
    storage.values.set(key, JSON.stringify(record));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft?.startDate).toBe("");
  });

  it("defaults a missing legacy invitation-role map to an empty map", () => {
    const storage = memoryStorage();
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    const key = [...storage.values.keys()][0];
    const record = JSON.parse(storage.values.get(key)!) as { draft: Record<string, unknown> };
    delete record.draft.invitationRoles;
    storage.values.set(key, JSON.stringify(record));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft?.invitationRoles).toEqual({});
  });

  it.each([
    ["invalid invitation role", (draft: ReturnType<typeof createWorkspaceDraft>) => ({ ...draft, invitationRoles: { "a@example.test": "Owner" } })],
    ["null invitation roles", (draft: ReturnType<typeof createWorkspaceDraft>) => ({ ...draft, invitationRoles: null })],
    ["invalid setting", (draft: ReturnType<typeof createWorkspaceDraft>) => ({ ...draft, settings: { ...draft.settings, hidePersonalPatrimony: "yes" } })],
    ["oversized array", (draft: ReturnType<typeof createWorkspaceDraft>) => ({ ...draft, emails: Array(101).fill("a@example.test") })],
    ["unknown prototype-like field", (draft: ReturnType<typeof createWorkspaceDraft>) => ({ ...draft, __proto__: { polluted: true }, unexpected: true })],
  ])("rejects %s and never restores raw draft properties", (_label, mutate) => {
    const storage = memoryStorage();
    const draft = mutate(createWorkspaceDraft());
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    const key = [...storage.values.keys()][0];
    storage.values.set(key, JSON.stringify({ version: 1, userId: "user-a", step: 1, draft }));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft).toBeNull();
  });

  it("rejects malformed JSON, identity/version mismatch and skips anonymous keys", () => {
    const storage = memoryStorage();
    expect(writeWorkspaceDraft(storage, "", createWorkspaceDraft(), 0)).toBe(false);
    expect(readWorkspaceDraft(storage, "", 1).draft).toBeNull();
    expect(removeWorkspaceDraft(storage, "")).toBe(false);
    expect(storage.values.size).toBe(0);
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    const key = [...storage.values.keys()][0];
    storage.values.set(key, "{");
    expect(readWorkspaceDraft(storage, "user-a", 1).notice).toContain("No se pudo leer");
    storage.values.set(key, JSON.stringify({ version: 2, userId: "user-a", draft: createWorkspaceDraft(), step: 0 }));
    expect(readWorkspaceDraft(storage, "user-a", 1).draft).toBeNull();
  });

  it.each([
    ["wrong user", { version: 1, userId: "user-b", consumed: "created-id" }],
    ["wrong version", { version: 2, userId: "user-a", consumed: "created-id" }],
    ["empty marker", { version: 1, userId: "user-a", consumed: "" }],
    ["non-string marker", { version: 1, userId: "user-a", consumed: 42 }],
  ])("does not claim a consumed record with %s", (_label, envelope) => {
    const storage = memoryStorage();
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    const key = [...storage.values.keys()][0];
    storage.values.set(key, JSON.stringify(envelope));
    const result = readWorkspaceDraft(storage, "user-a", 1);
    expect(result.consumedId).toBeUndefined();
    expect(result.notice).toContain("no es válido");
  });

  it("blocks restore after a committed workspace when removal fails but consumed marker succeeds", () => {
    const storage = memoryStorage();
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 2);
    storage.removeItem = () => { throw new Error("private mode"); };
    expect(removeWorkspaceDraft(storage, "user-a")).toBe(false);
    expect(markWorkspaceDraftConsumed(storage, "user-a", "created-id")).toBe(true);
    expect(readWorkspaceDraft(storage, "user-a", 1)).toMatchObject({ draft: null, consumedId: "created-id" });
  });

  it("returns unavailable storage when the browser storage getter throws", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, get: () => { throw new Error("blocked storage"); } });
    try { expect(getBrowserDraftStorage()).toBeNull(); }
    finally { if (descriptor) Object.defineProperty(globalThis, "window", descriptor); else delete (globalThis as { window?: unknown }).window; }
  });

  it("reports failed writes and removes only the matching user's record", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error("quota"); };
    expect(writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1)).toBe(false);
    storage.setItem = (key, value) => { storage.values.set(key, value); };
    writeWorkspaceDraft(storage, "user-a", createWorkspaceDraft(), 1);
    removeWorkspaceDraft(storage, "user-a", 1);
    expect(storage.values.size).toBe(0);
  });
});
