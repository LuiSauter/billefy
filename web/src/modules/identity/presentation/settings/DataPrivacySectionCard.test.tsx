import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataPrivacySectionCard } from "./DataPrivacySectionCard";

type Node = { type: unknown; props: Record<string, unknown> };

function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  const { type, props } = tree;
  return [{ type, props }, ...nodes(props.children)];
}

function find(tree: unknown, predicate: (node: Node) => boolean): Node {
  const node = nodes(tree).find(predicate);
  if (!node) throw new Error("Missing control");
  return node;
}

function buttonLabeled(tree: unknown, label: string): Node {
  return find(
    tree,
    (node) => typeof node.props.onClick === "function" && renderToStaticMarkup(node.props.children as React.ReactElement).includes(label)
  );
}

function render(overrides: Partial<React.ComponentProps<typeof DataPrivacySectionCard>> = {}) {
  return DataPrivacySectionCard({
    autoBackup: true,
    onAutoBackupChange: vi.fn(),
    onExportData: vi.fn().mockResolvedValue(undefined),
    onImportCsv: vi.fn(),
    onDownloadReport: vi.fn(),
    onClearStorage: vi.fn(),
    onOpenDeleteAccount: vi.fn(),
    ...overrides,
  });
}

describe("DataPrivacySectionCard", () => {
  it("invokes onClearStorage, not a bypassed handler, when 'Borrar datos financieros' is clicked", () => {
    const onClearStorage = vi.fn();
    const tree = render({ onClearStorage });
    const button = buttonLabeled(tree, "Borrar datos financieros");

    expect(button.props.onClick).toBe(onClearStorage);
    (button.props.onClick as () => void)();
    expect(onClearStorage).toHaveBeenCalledTimes(1);
  });

  it("invokes onOpenDeleteAccount when 'Eliminar cuenta' is clicked", () => {
    const onOpenDeleteAccount = vi.fn();
    const tree = render({ onOpenDeleteAccount });
    const button = buttonLabeled(tree, "Eliminar cuenta");

    (button.props.onClick as () => void)();
    expect(onOpenDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
