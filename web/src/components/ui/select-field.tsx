import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "cn"

type SelectFieldOption = {
  value: string
  label: string
  /** Native options cannot render rich content: shown as "label · description". */
  description?: string
}

type SelectFieldProps = Omit<React.ComponentProps<"select">, "size"> & {
  options?: SelectFieldOption[]
  /** Rendered as a disabled first option with an empty value. */
  placeholder?: string
  /** Extra classes for the wrapper around the select + chevron. */
  wrapperClassName?: string
}

/**
 * Styled native <select>. Native is intentional: best picker UX on mobile.
 * Pass `options` or plain <option> children.
 */
function SelectField({
  options,
  placeholder,
  className,
  wrapperClassName,
  children,
  value,
  defaultValue,
  ...props
}: SelectFieldProps) {
  // A disabled placeholder is only displayed when the select starts empty.
  const resolvedDefault =
    value === undefined && defaultValue === undefined && placeholder
      ? ""
      : defaultValue

  return (
    <div
      data-slot="select-field"
      className={cn("relative w-full", wrapperClassName)}
    >
      <select
        value={value}
        defaultValue={value === undefined ? resolvedDefault : undefined}
        className={cn(
          "h-12 w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-input bg-card py-2 pr-10 pl-3.5 text-base font-medium text-foreground transition-colors outline-hidden focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:h-11 md:text-[15px]",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.description
              ? `${option.label} · ${option.description}`
              : option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { SelectField }
export type { SelectFieldOption, SelectFieldProps }
