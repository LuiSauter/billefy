import * as React from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { appCardClassName } from "@/shared/presentation/card-variants";

/** Shared surface for every Investments card (same recipe as DashboardCard / AccountsCard, from shared/presentation/card-variants). */
export function InvestmentsCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn(appCardClassName, className)} {...props} />;
}
