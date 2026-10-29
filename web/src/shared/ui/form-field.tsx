"use client"

import * as React from "react"
import { cn } from "cn"

/** Props a control must receive to be wired to its `FormField`. */
export type FormFieldControlProps = {
  id: string
  "aria-invalid"?: true
  "aria-describedby"?: string
  "aria-required"?: true
}

const FormFieldContext = React.createContext<FormFieldControlProps | null>(null)

/**
 * Returns the id / aria props of the surrounding `FormField`, so a custom
 * control can wire itself without using the render-prop form.
 * Returns `null` outside of a `FormField`.
 */
function useFormFieldControl(): FormFieldControlProps | null {
  return React.useContext(FormFieldContext)
}

type FormFieldProps = {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /** Overrides the generated control id (label `for` and control `id`). */
  htmlFor?: string
  className?: string
  /**
   * Either a render-prop that receives `{ id, aria-invalid, aria-describedby }`
   * or plain nodes (read the same props through `useFormFieldControl()`).
   */
  children:
    | React.ReactNode
    | ((control: FormFieldControlProps) => React.ReactNode)
}

function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId()
  const id = htmlFor ?? generatedId
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined

  const control = React.useMemo<FormFieldControlProps>(
    () => ({
      id,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
      "aria-required": required ? true : undefined,
    }),
    [id, error, describedBy, required]
  )

  return (
    <FormFieldContext.Provider value={control}>
      <div data-slot="form-field" className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={id}
          className="text-sm font-semibold text-foreground"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </label>
        {typeof children === "function" ? children(control) : children}
        {hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  )
}

type FormSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
}

/** Titled group of fields, separated from the previous one by a divider. */
function FormSection({
  title,
  description,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <section
      data-slot="form-section"
      className={cn(
        "flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

/** Two columns from `sm`, single column below. */
function FormGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-grid"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}
      {...props}
    />
  )
}

export { FormField, FormSection, FormGrid, useFormFieldControl }
export type { FormFieldProps }
