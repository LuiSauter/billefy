"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"

type SegmentedTone = "default" | "income" | "expense"

type SegmentedOption<T extends string> = {
  value: T
  label: React.ReactNode
  tone?: SegmentedTone
}

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
  disabled?: boolean
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

const ACTIVE_TONE: Record<SegmentedTone, string> = {
  default: "text-foreground",
  income: "text-success",
  expense: "text-destructive",
}

/** Radio-group styled as an iOS-like segmented control. */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  disabled = false,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex

  function select(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    refs.current[index]?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = options.length - 1
    let next: number | null = null
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
    }
    if (next !== null) {
      event.preventDefault()
      select(next)
    }
  }

  return (
    <div
      role="radiogroup"
      data-slot="segmented-control"
      className={cn(
        "gap-1 rounded-xl bg-muted p-1",
        fullWidth ? "flex w-full" : "inline-flex",
        className
      )}
      {...aria}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-all outline-hidden focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9",
              fullWidth && "flex-1",
              active
                ? cn(
                    "bg-card shadow-sm",
                    ACTIVE_TONE[option.tone ?? "default"]
                  )
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps, SegmentedOption, SegmentedTone }
