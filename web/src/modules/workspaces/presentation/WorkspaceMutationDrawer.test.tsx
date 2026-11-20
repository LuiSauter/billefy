import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";
import { viewNodes } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
  }, useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  } };
});
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
describe("Workspace mutation confirmation", () => {
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; vi.stubGlobal("React", React); });
  afterEach(() => vi.unstubAllGlobals());
  function setup(prepare: () => () => Promise<unknown>) {
    const onClose = vi.fn();
    const render = () => { hooks.cursor = 0; return WorkspaceMutationDrawer({ title: "Confirmar", description: "Acción compartida", formId: "confirmation", submitLabel: "Guardar", onClose, prepare, children: <p>Datos</p> }); };
    const submit = () => (viewNodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    return { render, submit, onClose };
  }
  it("does not call the server on validation errors and permits correction", async () => {
    let valid = false;
    const operation = vi.fn().mockResolvedValue(undefined);
    const test = setup(() => { if (!valid) throw new Error("Monto inválido"); return operation; });
    await test.submit();
    expect(renderToStaticMarkup(test.render())).toContain("Monto inválido");
    expect(operation).not.toHaveBeenCalled();
    valid = true;
    await test.submit();
    expect(operation).toHaveBeenCalledOnce();
    expect(test.onClose).toHaveBeenCalledOnce();
  });
  it("suppresses concurrent double submissions", async () => {
    let resolve!: () => void;
    const operation = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const test = setup(() => operation);
    const first = test.submit();
    await test.submit();
    expect(operation).toHaveBeenCalledOnce();
    expect(test.onClose).not.toHaveBeenCalled();
    resolve();
    await first;
    expect(test.onClose).toHaveBeenCalledOnce();
  });
  it("retains a failed/uncertain write and prevents a duplicate retry", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("lost response"));
    const test = setup(() => operation);
    await test.submit();
    expect(renderToStaticMarkup(test.render())).toContain("Cierra y actualiza los datos");
    await test.submit();
    expect(operation).toHaveBeenCalledOnce();
    expect(test.onClose).not.toHaveBeenCalled();
  });
});
