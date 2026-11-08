import React from "react";
import Decimal from "decimal.js";
import type { LucideIcon } from "lucide-react";
import { Tag } from "lucide-react";
import { Progress } from "@/shared/ui/progress";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import type { WorkspaceCategoryBreakdownDto } from "../domain/workspaces.types";
import { workspaceMoney, workspacePanel } from "./workspace-ui";

export function workspacePeriodKey(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}
export function workspacePeriodLabel(year: number, month: number) {
  return new Date(`${workspacePeriodKey(year, month)}-01T00:00:00Z`).toLocaleDateString("es", { month: "long", year: "numeric", timeZone: "UTC" });
}
export function workspacePercentage(amount: Decimal.Value, total: Decimal.Value) {
  return new Decimal(total).gt(0) ? new Decimal(amount).div(total).mul(100).toDecimalPlaces(1).toNumber() : 0;
}
export function WorkspaceProgress({ value, label }: { value: number; label: string }) {
  return <Progress value={Math.max(0, Math.min(100, value))} aria-label={label}
    className={`[&_[data-slot=progress-track]]:bg-muted [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-chart-4 ${value >= 95 ? "[&_[data-slot=progress-indicator]]:to-destructive" : "[&_[data-slot=progress-indicator]]:to-primary"}`} />;
}
export function WorkspaceKpi({ label, value, Icon, featured, tone = "text-primary", children }: { label: string; value: string; Icon: LucideIcon; featured?: boolean; tone?: string; children?: React.ReactNode }) {
  return <section className={`${workspacePanel} ${featured ? "border-chart-4/40 bg-gradient-to-br from-chart-4/30 to-primary/10" : "bg-gradient-to-br from-muted/30 to-card"}`}>
    <div className="flex items-center gap-3"><span className={`rounded-full bg-muted/60 p-3 ${tone}`}><Icon className="size-6" aria-hidden="true" /></span><div className="min-w-0"><h2 className="text-xs text-muted-foreground">{label}</h2><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p></div></div>
    {children && <div className="mt-3">{children}</div>}
  </section>;
}
const chartColors = ["var(--chart-4)", "var(--chart-1)", "var(--chart-2)", "var(--chart-5)", "var(--chart-3)"];
export function WorkspaceDonut({ segments, label, children }: { segments: number[]; label: string; children: React.ReactNode }) {
  let offset = 0;
  return <div className="relative mx-auto size-44 shrink-0 sm:size-48">
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-full -rotate-90">
      <circle cx="60" cy="60" r="48" fill="none" stroke="var(--muted)" strokeWidth="17" />
      {segments.map((segment, index) => {
        const length = Math.max(0, Math.min(segment, 100 - offset));
        const start = offset;
        offset += length;
        return <circle key={index} cx="60" cy="60" r="48" pathLength="100" fill="none" stroke={chartColors[index % chartColors.length]} strokeWidth="17" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} />;
      })}
    </svg><div className="absolute inset-7 flex flex-col items-center justify-center text-center">{children}</div>
  </div>;
}
export function WorkspaceCategory({ id }: { id: string | null }) {
  const { findCategory } = useUserCategories();
  const category = id ? findCategory(id) : undefined;
  return <span className="inline-flex items-center gap-2">{category ? <CategoryIconBadge iconKey={category.iconKey} colorKey={category.colorKey} size="sm" /> : <Tag className="size-5 shrink-0 text-chart-4" aria-hidden="true" />}<span>{category?.name ?? (id ? "Categoría compartida" : "Sin categoría")}</span></span>;
}
export function WorkspaceCategoryList({ items, currency }: { items: WorkspaceCategoryBreakdownDto[]; currency: string }) {
  return items.length ? <ul className="min-w-0 flex-1 divide-y divide-border">{items.map((item, index) => <li key={item.categoryId ?? "none"} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><WorkspaceCategory id={item.categoryId} /></span><span className="ml-auto tabular-nums text-muted-foreground">{item.percentage}%</span><strong className="min-w-24 text-right tabular-nums">{workspaceMoney(item.amount, currency)}</strong></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">Sin gastos por categoría en este período.</p>;
}
