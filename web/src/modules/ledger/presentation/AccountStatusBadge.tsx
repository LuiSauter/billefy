import * as React from "react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

/** "Activa" status pill shared by the detail hero and the account info card. */
export function AccountStatusBadge({ className }: { className?: string }) {
  return (
    <Badge variant="success" className={cn("border-emerald-500/30 font-bold", className)}>
      Activa
    </Badge>
  );
}
