"use client";

import React, { useRef } from "react";
import { cn } from "cn";

export type ChipOption = { value: string; label: string };

interface ChipRadioGroupProps {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  scroll?: boolean;
}

/** Accessible radio-group of pill chips (roving tabindex + arrow keys), >= 44px tall. */
export function ChipRadioGroup({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: ChipRadioGroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const move = (event: React.KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    }
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-2",
        scroll ? "-mx-1 overflow-x-auto px-1 pb-1" : "flex-wrap"
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-hidden focus-visible:ring-4 focus-visible:ring-ring/25",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
