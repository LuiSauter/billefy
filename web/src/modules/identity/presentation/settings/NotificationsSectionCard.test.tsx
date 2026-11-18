import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWebPushPermissionState: vi.fn(() => "default" as string),
  subscribeToWebPushExplicitly: vi.fn(async () => true),
}));

vi.mock("../../application/webPushSubscription", () => ({
  getWebPushPermissionState: mocks.getWebPushPermissionState,
  subscribeToWebPushExplicitly: mocks.subscribeToWebPushExplicitly,
}));
vi.mock("@/shared/infrastructure/fetch-http.client", () => ({
  FetchHttpClient: class {},
}));

// Node-only harness (no DOM renderer): model hook renders and effect commits
// explicitly, same approach as AuthContext.test.tsx and usePatrimonio.test.tsx.
let slots: unknown[] = [];
let cursor = 0;
let pendingEffects: (() => void)[] = [];
vi.mock("react", () => {
  const createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
    type,
    props: { ...props, children },
  });
  return {
    default: { createElement },
    createElement,
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value: unknown) => {
          slots[index] = typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useEffect: (callback: () => void, dependencies: unknown[]) => {
      const index = cursor++;
      const previous = slots[index] as unknown[] | undefined;
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
        pendingEffects.push(callback);
      }
      slots[index] = dependencies;
    },
  };
});

import { NotificationsSectionCard } from "./NotificationsSectionCard";

type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (tree === null || typeof tree !== "object" || !("type" in (tree as object))) return [];
  const { type, props } = tree as Node;
  return [{ type, props }, ...nodes(props.children)];
}
function switchLabeled(tree: unknown, label: string): Node {
  const found = nodes(tree).find(
    (node) => typeof node.props.onCheckedChange === "function" && JSON.stringify(node.props.label).includes(label)
  );
  if (!found) throw new Error(`Missing switch for "${label}"`);
  return found;
}

const settings = { budgetAlerts: true, debtDueAlerts: true, goalsAlerts: true, largeMovementsAlerts: true, weeklySummary: true };

function render() {
  cursor = 0;
  return NotificationsSectionCard({ settings, onChange: vi.fn() });
}
async function commit() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach((effect) => effect());
  await Promise.resolve();
}

beforeEach(() => {
  slots = [];
  cursor = 0;
  pendingEffects = [];
  mocks.getWebPushPermissionState.mockReset().mockReturnValue("default");
  mocks.subscribeToWebPushExplicitly.mockReset().mockResolvedValue(true);
});

describe("NotificationsSectionCard web push toggle", () => {
  it("reflects granted as checked and denied/unsupported as disabled+unchecked", async () => {
    mocks.getWebPushPermissionState.mockReturnValue("granted");
    const toggle = switchLabeled(render(), "Notificaciones push del navegador");
    expect(toggle.props.checked).toBe(true);
    expect(toggle.props.disabled).toBe(false);
  });

  it("is disabled when permission was denied", () => {
    mocks.getWebPushPermissionState.mockReturnValue("denied");
    const toggle = switchLabeled(render(), "Notificaciones push del navegador");
    expect(toggle.props.checked).toBe(false);
    expect(toggle.props.disabled).toBe(true);
  });

  it("is disabled when unsupported by the browser", () => {
    mocks.getWebPushPermissionState.mockReturnValue("unsupported");
    const toggle = switchLabeled(render(), "Notificaciones push del navegador");
    expect(toggle.props.disabled).toBe(true);
  });

  it("calling onCheckedChange(true) subscribes and reflects the resulting permission", async () => {
    mocks.getWebPushPermissionState.mockReturnValueOnce("default").mockReturnValueOnce("granted");
    const toggle = switchLabeled(render(), "Notificaciones push del navegador");

    await (toggle.props.onCheckedChange as (checked: boolean) => Promise<void>)(true);
    await commit();

    expect(mocks.subscribeToWebPushExplicitly).toHaveBeenCalledTimes(1);
  });

  it("never calls subscribeToWebPushExplicitly for onCheckedChange(false)", async () => {
    const toggle = switchLabeled(render(), "Notificaciones push del navegador");
    await (toggle.props.onCheckedChange as (checked: boolean) => Promise<void>)(false);
    expect(mocks.subscribeToWebPushExplicitly).not.toHaveBeenCalled();
  });
});
