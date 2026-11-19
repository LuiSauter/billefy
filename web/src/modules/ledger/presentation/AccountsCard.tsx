import * as React from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { appCardClassName } from "@/shared/presentation/card-variants";

/** Shared surface for every Accounts card (same recipe as DashboardCard, from shared/presentation/card-variants). */
export function AccountsCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn(appCardClassName, className)} {...props} />;
}
