import * as React from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import {
  appCardClassName,
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";

/** Shared surface variant for every dashboard home card (single source: shared/presentation/card-variants). */
export const dashboardCardClassName = appCardClassName;

/** Dashboard standard spacing: p-4 for the main grid cards (hero KPIs are a deliberate p-5 tier). */
export const dashboardCardHeaderClassName = appCardHeaderClassName;
export const dashboardCardContentClassName = appCardContentClassName;

/** Dashboard type scale: card titles are text-base font-extrabold. */
export const dashboardCardTitleClassName = appCardTitleClassName;

export function DashboardCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn(dashboardCardClassName, className)} {...props} />;
}
