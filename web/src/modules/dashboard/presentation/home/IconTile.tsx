import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const VARIANT_CLASSES = {
  emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  rose: "bg-rose-500/15 border-rose-500/30 text-rose-400",
  purple: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  blue: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  amber: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  cyan: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
  indigo: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
  muted: "bg-muted/60 border-transparent text-muted-foreground",
  primary: "bg-primary border-transparent text-white shadow-xs",
} as const;

const SIZE_CLASSES = {
  sm: { tile: "w-8 h-8", icon: "w-4 h-4" },
  md: { tile: "w-9 h-9", icon: "w-4 h-4" },
  xl: { tile: "w-12 h-12", icon: "w-6 h-6" },
} as const;

export type IconTileVariant = keyof typeof VARIANT_CLASSES;
export type IconTileSize = keyof typeof SIZE_CLASSES;

export interface IconTileProps {
  icon: LucideIcon;
  variant?: IconTileVariant;
  size?: IconTileSize;
  className?: string;
}

export function IconTile({ icon: Icon, variant = "purple", size = "md", className }: IconTileProps) {
  const sizing = SIZE_CLASSES[size];
  return (
    <div
      className={cn(
        "rounded-xl border flex items-center justify-center shrink-0",
        sizing.tile,
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <Icon className={sizing.icon} />
    </div>
  );
}
