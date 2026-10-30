"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"

import { sanitizeDecimalInput } from "@/shared/lib/money-input"

type MoneyInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "size" | "type" | "inputMode"
> & {
  /** Controlled value as a decimal string ("12.50"). Never a number. */
  value: string
  /** Receives the sanitized decimal string. */
  onValueChange: (value: string) => void
  /** Currency label shown in the leading chip: "Bs", "$", "USDT"... */
  currency: string
  /** Maximum fractional digits (default 2). */
  maxDecimals?: number
  /** `lg` renders the amount as a big hero number. */
  size?: "default" | "lg"
  /** Extra classes for the outer wrapper. */
  wrapperClassName?: string
}

function MoneyInput({
  value,
  onValueChange,
  currency,
  maxDecimals = 2,
  size = "default",
  className,
  wrapperClassName,
  placeholder = "0.00",
  ...props
}: MoneyInputProps) {
  return (
    <div
      data-slot="money-input"
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border border-input bg-card px-2.5 transition-colors focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-4 has-[input[aria-invalid=true]]:ring-destructive/15 has-[input:disabled]:bg-muted has-[input:disabled]:opacity-60",
        size === "lg" ? "h-16 md:h-16" : "h-12 md:h-11",
        wrapperClassName
      )}
    >
      <span
        data-slot="money-input-currency"
        className={cn(
          "inline-flex shrink-0 items-center rounded-lg bg-muted px-2.5 font-semibold text-muted-foreground",
          size === "lg" ? "h-9 text-sm" : "h-7 text-sm"
        )}
      >
        {currency}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onValueChange(sanitizeDecimalInput(event.target.value, maxDecimals))
        }
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent tabular-nums text-foreground outline-hidden placeholder:text-muted-foreground/70 disabled:cursor-not-allowed",
          size === "lg"
            ? "text-2xl font-bold"
            : "text-base font-medium md:text-[15px]",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { MoneyInput }
export type { MoneyInputProps }
