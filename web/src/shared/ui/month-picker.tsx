"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"

export const MONTH_NAMES = [
  { label: "Ene", full: "Enero", value: "01" },
  { label: "Feb", full: "Febrero", value: "02" },
  { label: "Mar", full: "Marzo", value: "03" },
  { label: "Abr", full: "Abril", value: "04" },
  { label: "May", full: "Mayo", value: "05" },
  { label: "Jun", full: "Junio", value: "06" },
  { label: "Jul", full: "Julio", value: "07" },
  { label: "Ago", full: "Agosto", value: "08" },
  { label: "Sep", full: "Septiembre", value: "09" },
  { label: "Oct", full: "Octubre", value: "10" },
  { label: "Nov", full: "Noviembre", value: "11" },
  { label: "Dic", full: "Diciembre", value: "12" },
]

export interface MonthPickerProps {
  value: string // "YYYY-MM"
  onChange: (value: string) => void
  className?: string
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [currentYear, setCurrentYear] = React.useState(() => {
    const [y] = (value || "").split("-")
    return Number(y) || new Date().getFullYear()
  })

  React.useEffect(() => {
    const [y] = (value || "").split("-")
    if (y && Number(y)) {
      setCurrentYear(Number(y))
    }
  }, [value])

  const selectedYear = Number((value || "").split("-")[0])
  const selectedMonth = (value || "").split("-")[1]

  return (
    <div className={cn("w-64 p-3 space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCurrentYear((y) => y - 1)}
          aria-label="Año anterior"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-bold tracking-tight text-foreground">
          {currentYear}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCurrentYear((y) => y + 1)}
          aria-label="Año siguiente"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_NAMES.map((m) => {
          const isSelected = selectedYear === currentYear && selectedMonth === m.value
          return (
            <Button
              key={m.value}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              onClick={() => onChange(`${currentYear}-${m.value}`)}
              className={cn(
                "h-9 rounded-xl text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {m.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
