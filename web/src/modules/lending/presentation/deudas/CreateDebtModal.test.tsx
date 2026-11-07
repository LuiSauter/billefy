import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanScheduleDto } from "../../domain/lending.types";

// The project runner is Node-only (no DOM renderer). Exercise component handlers
// and effect lifecycles with the same state-slot approach as InvestmentCashModal.
const { hooks } = vi.hoisted(() => ({
  hooks: { cursor: 0, slots: [] as unknown[], pending: [] as (() => void)[] },
}));
type EffectSlot = { deps?: React.DependencyList; cleanup?: () => void };
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === "function" ? initial() : initial;
      return [hooks.slots[i], (next: unknown) => {
        hooks.slots[i] = typeof next === "function" ? next(hooks.slots[i]) : next;
      }];
    },
    useRef: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.slots)) hooks.slots[i] = { current: initial };
      return hooks.slots[i];
    },
    useEffect: (effect: () => void | (() => void), deps?: React.DependencyList) => {
      const i = hooks.cursor++;
      const previous = hooks.slots[i] as EffectSlot | undefined;
      if (deps && previous?.deps && deps.every((dep, index) => Object.is(dep, previous.deps![index]))) return;
      hooks.pending.push(() => {
        previous?.cleanup?.();
        hooks.slots[i] = { deps, cleanup: effect() };
      });
    },
  };
});

// Only replace the portal/viewport shell; the markup test renders the actual
// design-system fields, buttons, segmented control, and disabled switches.
vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, title, description, children, footer }: import("@/shared/ui/responsive-drawer").ResponsiveDrawerProps) =>
    open ? <section role="dialog"><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null,
}));

import { CreateDebtModal, type CreateDebtModalProps } from "./CreateDebtModal";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Switch } from "@/shared/ui/switch";
import { Progress } from "@/shared/ui/progress";

type Node = { type?: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  const node = tree as Node;
  if (!node.props) return [];
  const children = typeof node.props.children === "function"
    ? node.props.children({ id: node.props.htmlFor }) : node.props.children;
  return [node, ...nodes(children), ...nodes(node.props.footer), ...nodes(node.props.title)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (!tree || typeof tree !== "object") return "";
  const props = (tree as Node).props;
  if (!props) return "";
  const children = typeof props.children === "function" ? props.children({ id: props.htmlFor }) : props.children;
  return [props.label, props.hint, props.description, props.title, children, props.footer].map(text).join(" ");
}
function control(tree: unknown, id: string): Node {
  const result = nodes(tree).find(node => node.props.id === id);
  if (!result) throw new Error(`Missing control ${id}`);
  return result;
}
function change(tree: unknown, id: string, value: string) {
  const props = control(tree, id).props;
  if (props.onValueChange) (props.onValueChange as (value: string) => void)(value);
  else (props.onChange as (event: unknown) => void)({ target: { value } });
}
function click(tree: unknown, label: string) {
  const button = nodes(tree).find(node => text(node.props.children).trim() === label && node.props.onClick);
  if (!button) throw new Error(`Missing button ${label}`);
  (button.props.onClick as () => void)();
}
const accounts: AccountDto[] = [
  { id: "bob-account", name: "Cuenta BOB", currency: "BOB", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
  { id: "usd-account", name: "Cuenta USD", currency: "USD", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
];
const schedule: LoanScheduleDto = {
  installments: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, dueDate: "2026-11-01",
    principal: 100, interest: 10, total: 110, balanceAfter: 900 - i * 100 })),
  totalPrincipal: 1000, totalInterest: 100, totalToPay: 1100, annualEffectiveRate: 0.12,
};
let props: CreateDebtModalProps;
function render(overrides: Partial<CreateDebtModalProps> = {}) {
  props = { ...props, ...overrides };
  hooks.cursor = 0;
  const tree = CreateDebtModal(props);
  hooks.pending.splice(0).forEach(effect => effect());
  return tree;
}
function fill() {
  const tree = render();
  change(tree, "debt-reference", "  Crédito personal  ");
  change(tree, "debt-creditor", "  Entidad de prueba  ");
  change(tree, "debt-account", "bob-account");
  change(tree, "debt-principal", "1250.50");
  change(tree, "debt-rate", "18");
  change(tree, "debt-term", "24");
  change(tree, "debt-date", "2026-10-01");
  change(tree, "debt-description", "  Condiciones acordadas  ");
  return render();
}
async function submit(tree: unknown) {
  const form = nodes(tree).find(node => node.type === "form")!;
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}
async function simulate() {
  await vi.advanceTimersByTimeAsync(300);
  return render();
}
beforeEach(() => {
  hooks.cursor = 0; hooks.slots.length = 0; hooks.pending.length = 0;
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  props = { isOpen: true, accounts, onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue({}),
    onSimulate: vi.fn().mockResolvedValue(schedule), monthlyIncome: 1000, selectedCurrency: "BOB" };
});
afterEach(() => {
  hooks.slots.forEach(slot => (slot as EffectSlot | undefined)?.cleanup?.());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CreateDebtModal", () => {
  it("renders the wide drawer, design sections, accessible fields, and truthful unsupported controls", () => {
    const tree = render();
    expect(tree.type).toBe(ResponsiveDrawer);
    expect(tree.props.size).toBe("xl");
    for (const label of ["Crear deuda / préstamo", "Datos de la deuda", "Nombre / referencia", "Acreedor",
      "Cuenta asociada", "Moneda", "Monto inicial", "Saldo actual", "Tasa de interés anual %", "Plazo (meses)",
      "Fecha de inicio", "Método de cálculo", "Descripción / Notas", "Resumen del impacto", "Simulación rápida",
      "Sugerencias inteligentes", "Plantillas rápidas", "Cancelar", "Crear deuda", "Próximamente"]) {
      expect(text(tree)).toContain(label);
    }
    const unavailable = nodes(tree).filter(node => node.type === Switch && node.props.disabled);
    expect(unavailable).toHaveLength(2);
    expect(unavailable.every(node => node.props.checked === false)).toBe(true);
    expect(control(tree, "debt-balance").props.readOnly).toBe(true);
    expect(control(tree, "debt-balance").props.value).toBe("");
    const submitButton = nodes(tree).find(node => node.props.type === "submit")!;
    expect(submitButton.props.form).toBe(nodes(tree).find(node => node.type === "form")!.props.id);
    expect(submitButton.props.disabled).toBe(true);
  });

  it("renders actual design-system markup with labeled inputs and category radios", () => {
    const html = renderToStaticMarkup(fill());
    expect(html).toContain('role="dialog"');
    expect(html).toContain('for="debt-principal"');
    expect(html).toContain('id="debt-principal"');
    expect(html).toContain('value="1250.50"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-slot="money-input"');
    expect(html).toContain('data-slot="form-field"');
    expect(html).toContain('form="create-debt-form"');
    expect(html).toMatch(/readonly=""/i);
    expect(html).toContain('aria-label="Afecta ratio de endeudamiento"');
  });

  it.each([["Tarjeta", "Tarjeta", "36", "12"], ["Hipoteca", "Hipoteca", "9.5", "240"],
    ["Vehicular", "Vehicular", "11", "48"], ["Préstamo personal", "Personal", "18", "24"]])(
    "applies the %s template without overwriting entered identity or amount", async (label, category, rate, term) => {
      let tree = fill(); click(tree, label); tree = render();
      expect(control(tree, "debt-rate").props.value).toBe(rate);
      expect(control(tree, "debt-term").props.value).toBe(term);
      expect(control(tree, "debt-method").props.value).toBe("FixedInstallment");
      expect(nodes(tree).find(node => node.props["aria-label"] === "Categoría de deuda")!.props.value).toBe(category);
      expect(control(tree, "debt-principal").props.value).toBe("1250.50");
      expect(control(tree, "debt-reference").props.value).toBe("  Crédito personal  ");
      await simulate();
      expect(props.onSimulate).toHaveBeenCalledWith(expect.objectContaining({ rate: Number(rate) / 100, totalInstallments: Number(term) }));
      await submit(tree);
      expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ counterpartyNotes: expect.stringContaining(`Categoría: ${category}`) }));
    });

  it("syncs current balance to principal and submits only supported fields with exact annual rate and notes", async () => {
    const tree = fill();
    expect(control(tree, "debt-balance").props.value).toBe("1250.50");
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith({
      type: "Borrowed", counterpartyName: "Entidad de prueba", principal: 1250.5, currency: "BOB",
      interestRate: 0.18, rateUnit: "Annual", frequency: "Monthly", template: "FixedInstallment",
      totalInstallments: 24, disbursementDate: "2026-10-01", disbursementAccountId: "bob-account",
      counterpartyNotes: "Referencia: Crédito personal\nCategoría: Personal\nDescripción: Condiciones acordadas",
    });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("debounces live simulation and sends annual percentage as a fraction with the selected method", async () => {
    let tree = fill();
    change(tree, "debt-principal", "1000");
    change(tree, "debt-method", "SimpleOnBalance");
    render();
    await vi.advanceTimersByTimeAsync(299);
    expect(props.onSimulate).not.toHaveBeenCalled();
    tree = await simulate();
    expect(props.onSimulate).toHaveBeenCalledExactlyOnceWith({ principal: 1000, rate: 0.18, rateUnit: "Annual",
      frequency: "Monthly", totalInstallments: 24, template: "SimpleOnBalance", disbursementDate: "2026-10-01" });
    expect(text(tree)).toContain("110,00");
    expect(text(tree)).toContain("11,00%");
    expect(text(tree)).toContain("Si adelantas");
  });

  it("converts the installment into the income currency for DTI, without changing the saved currency", async () => {
    fill(); render({ selectedCurrency: "USD", monthlyIncome: 100, p2pRate: 10 });
    let tree = await simulate();
    expect(text(tree)).toContain("11,00%");
    expect(control(tree, "debt-currency").props.value).toBe("BOB");
    const toggle = control(tree, "debt-dti");
    (toggle.props.onCheckedChange as (checked: boolean) => void)(false);
    tree = render();
    expect(text(tree)).toContain("Excluida de esta vista previa");
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ currency: "BOB" }));
    expect(props.onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({ affectsDti: false }));
  });

  it.each([{ monthlyIncome: undefined }, { monthlyIncome: 0 }, { monthlyIncome: 100, selectedCurrency: "USD", p2pRate: undefined }])(
    "does not invent a controlled DTI with missing income or FX: %j", async overrides => {
      fill(); render(overrides); const tree = await simulate();
      expect(text(tree)).not.toContain("Controlado");
      expect(nodes(tree).filter(node => node.type === Progress)).toHaveLength(0);
      expect(text(tree)).toMatch(/ingresos mensuales|tipo de cambio/);
    });

  it("shows unavailable simulation honestly when the callback is absent, but allows creation", async () => {
    render({ onSimulate: undefined }); const tree = fill();
    await vi.advanceTimersByTimeAsync(1000);
    expect(text(tree)).toContain("Simulación no disponible");
    expect(text(tree)).not.toContain("Si adelantas");
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("clears the associated account on currency change and rejects a mismatched account", async () => {
    let tree = fill(); change(tree, "debt-currency", "USD"); tree = render();
    expect(control(tree, "debt-account").props.value).toBe("");
    await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    change(tree, "debt-account", "bob-account"); tree = render();
    await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    change(tree, "debt-account", "usd-account"); tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD", disbursementAccountId: "usd-account" }));
  });

  it.each([["debt-principal", "0"], ["debt-principal", "NaN"], ["debt-rate", "-1"],
    ["debt-rate", ""], ["debt-term", "2.5"], ["debt-term", "0"], ["debt-date", "2026-02-30"],
    ["debt-reference", " "], ["debt-creditor", " "]])("rejects invalid %s=%s", async (id, value) => {
      let tree = fill(); change(tree, id, value); tree = render();
      await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    });

  it("shares quick-simulation inputs with the main fields and does not invent extra-payment savings", async () => {
    let tree = fill();
    change(tree, "debt-preview-term", "36"); change(tree, "debt-preview-rate", "9.5"); tree = render();
    expect(control(tree, "debt-term").props.value).toBe("36");
    expect(control(tree, "debt-rate").props.value).toBe("9.5");
    tree = await simulate();
    expect(props.onSimulate).toHaveBeenCalledWith(expect.objectContaining({ totalInstallments: 36, rate: 0.095 }));
    expect(text(tree)).toContain("Solicita una nueva simulación");
    expect(text(tree)).not.toContain("meses antes");
  });

  it("sends zero interest when the no-interest method is selected", async () => {
    let tree = fill(); change(tree, "debt-method", "NoInterest"); tree = render();
    await simulate();
    expect(props.onSimulate).toHaveBeenCalledWith(expect.objectContaining({ rate: 0, template: "NoInterest" }));
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ interestRate: 0 }));
  });

  it("retains input on submit failure, exposes a safe error, and guards duplicate submissions", async () => {
    let reject!: (reason: unknown) => void;
    props.onSubmit = vi.fn(() => new Promise((_, fail) => { reject = fail; }));
    let tree = fill(); const first = submit(tree); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledOnce();
    reject(new Error("private upstream details")); await first;
    tree = render();
    expect(control(tree, "debt-principal").props.value).toBe("1250.50");
    expect(text(tree)).toContain("No se pudo crear la deuda");
    expect(text(tree)).not.toContain("private upstream details");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("allows a retry after a failed write and omits an empty description from notes", async () => {
    props.onSubmit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    let tree = fill(); change(tree, "debt-description", "   "); tree = render();
    await submit(tree); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledTimes(2);
    expect(props.onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ counterpartyNotes: "Referencia: Crédito personal\nCategoría: Personal" }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it.each([{ ...schedule, installments: [] }, { ...schedule, totalInterest: -1 }])(
    "does not display invalid server schedules", async result => {
      props.onSimulate = vi.fn().mockResolvedValue(result);
      fill(); const tree = await simulate();
      expect(text(tree)).toContain("No se pudo simular");
      expect(text(tree)).not.toContain("Si adelantas");
    });

  it("does not retain stale simulation results after edits or out-of-order responses", async () => {
    let resolveFirst!: (value: LoanScheduleDto) => void;
    props.onSimulate = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValue({ ...schedule, installments: schedule.installments.map(item => ({ ...item, total: 220 })) });
    let tree = fill(); await simulate();
    change(tree, "debt-principal", "2000"); render(); tree = await simulate();
    expect(text(tree)).toContain("220,00");
    resolveFirst(schedule); await Promise.resolve(); tree = render();
    expect(text(tree)).toContain("220,00");
    expect(text(tree)).not.toContain("110,00");
    change(tree, "debt-principal", ""); tree = render();
    expect(text(tree)).not.toContain("220,00");
  });

  it("clears failed simulations rather than showing a stale payment", async () => {
    let tree = fill(); tree = await simulate(); expect(text(tree)).toContain("110,00");
    props.onSimulate = vi.fn().mockRejectedValue(new Error("private simulation details"));
    render(); tree = await simulate();
    expect(text(tree)).toContain("No se pudo simular");
    expect(text(tree)).not.toContain("110,00");
    expect(text(tree)).not.toContain("private simulation details");
  });

  it.each<[number, string, number]>([[1000, "Controlado", 11], [300, "Atención", 36.67], [200, "Crítico", 55], [50, "Crítico", 100]])(
    "uses calculated DTI thresholds and caps the bar for income %s", async (monthlyIncome, status, progress) => {
      fill(); render({ monthlyIncome }); const tree = await simulate();
      expect(text(tree)).toContain(status);
      const bar = nodes(tree).find(node => node.type === Progress)!;
      expect(bar.props.value as number).toBeCloseTo(progress, 2);
    });

  it("does not simulate invalid terms or offer creation without compatible accounts", async () => {
    fill(); let tree = render({ accounts: [] });
    expect(text(tree)).toMatch(/No hay cuentas en\s+BOB/);
    await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    change(tree, "debt-principal", ""); render();
    await vi.advanceTimersByTimeAsync(1000);
    expect(props.onSimulate).not.toHaveBeenCalled();
    tree = render(); expect(text(tree)).toContain("Completa monto");
  });

  it("does not apply a simulation response after close, and resimulates fresh data on reopen", async () => {
    let resolve!: (value: LoanScheduleDto) => void;
    props.onSimulate = vi.fn(() => new Promise<LoanScheduleDto>(done => { resolve = done; }));
    fill(); await simulate(); render({ isOpen: false });
    resolve(schedule); await Promise.resolve();
    let tree = render({ isOpen: true });
    expect(text(tree)).not.toContain("110,00");
    expect(control(tree, "debt-principal").props.value).toBe("");
    render({ onSimulate: vi.fn().mockResolvedValue(schedule) });
    fill(); tree = await simulate(); expect(text(tree)).toContain("110,00");
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledOnce();
    render({ isOpen: false }); render({ isOpen: true });
    await submit(fill()); expect(props.onSubmit).toHaveBeenCalledTimes(2);
  });

  it("cancels without submitting and resets the form when closed and reopened", () => {
    let tree = fill(); click(tree, "Cancelar"); expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSubmit).not.toHaveBeenCalled();
    render({ isOpen: false }); tree = render({ isOpen: true });
    expect(control(tree, "debt-reference").props.value).toBe("");
    expect(control(tree, "debt-principal").props.value).toBe("");
  });
});
