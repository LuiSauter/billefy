"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Amount, Percentage } from "@/shared/ui/amount";
import { cn } from "@/shared/lib/utils";

interface PatrimonioCategoryRowProps {
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  totalAmount: number;
  percentage: number;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  /** Drill-down content, rendered only while expanded. */
  children?: React.ReactNode;
}

/** Collapsible category row shared by the assets and liabilities lists (keyboard accessible disclosure). */
export function PatrimonioCategoryRow({
  icon: Icon,
  color,
  title,
  subtitle,
  totalAmount,
  percentage,
  currency,
  expanded,
  onToggle,
  children,
}: PatrimonioCategoryRowProps) {
  return (
    <div className="@container py-2.5 flex flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full py-2 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl transition cursor-pointer group text-left outline-hidden focus-visible:ring-4 focus-visible:ring-ring/15"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-foreground group-hover:text-purple-400 transition truncate">
              {title}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-foreground">
              <Amount value={totalAmount} currency={currency} size="inherit" tone="inherit" />
            </span>
            <span className="text-[11px] text-muted-foreground">
              <Percentage value={percentage} sign="never" size="inherit" tone="inherit" />
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-purple-400 transition" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" aria-hidden="true" />
          )}
        </div>
      </button>

      {expanded && (
        <div
          className={cn(
            "mt-2 ml-4 @md:ml-12 pl-3 border-l-2 border-border/80 flex flex-col gap-2 py-1 animate-in fade-in duration-100"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
