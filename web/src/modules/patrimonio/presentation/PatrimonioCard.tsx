import * as React from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { appCardClassName } from "@/shared/presentation/card-variants";

/** Shared surface for every Patrimonio card (same recipe as DashboardCard / AccountsCard / InvestmentsCard). */
export function PatrimonioCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn(appCardClassName, className)} {...props} />;
}
