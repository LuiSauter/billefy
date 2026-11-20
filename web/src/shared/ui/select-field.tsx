import * as React from "react"
import { NativeSelect } from "@/shared/ui/native-select"
import { cn } from "@/shared/lib/utils"

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
    <NativeSelect
      data-slot="select-field"
      size="lg"
      wrapperClassName={wrapperClassName}
      value={value}
      defaultValue={value === undefined ? resolvedDefault : undefined}
      className={cn("cursor-pointer disabled:bg-muted disabled:opacity-60", className)}
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
    </NativeSelect>
  )
}

export { SelectField }
export type { SelectFieldOption, SelectFieldProps }
