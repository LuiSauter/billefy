"use client";

import React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export interface PeriodOption {
  value: string;
  label: string;
}

interface PeriodDropdownProps {
  options: readonly PeriodOption[];
  value: string;
  onChange: (value: string) => void;
  /** Visible trigger size: "md" for page headers, "sm" for card headers. */
  size?: "sm" | "md";
  "aria-label"?: string;
}

/** Period picker shared by the Investments header and the evolution chart (shadcn DropdownMenu: closes on outside click / Escape). */
export function PeriodDropdown({
  options,
  value,
  onChange,
  size = "md",
  "aria-label": ariaLabel = "Período",
}: PeriodDropdownProps) {
  const active = options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className={cn("gap-2 font-semibold", size === "md" ? "h-10 px-3.5 rounded-xl text-xs" : "h-8 px-2.5 rounded-lg text-xs")}
          >
            <Calendar className="text-muted-foreground" aria-hidden="true" />
            <span>{active?.label}</span>
            <ChevronDown className="text-muted-foreground" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48 text-xs">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={option.value === value ? "font-semibold text-purple-400" : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
