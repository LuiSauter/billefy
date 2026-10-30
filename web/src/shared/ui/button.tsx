import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-hidden select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        success:
          "bg-success text-success-foreground shadow-xs hover:bg-success/90",
        dark: "bg-foreground text-background shadow-xs hover:bg-foreground/90",
        outline:
          "border-input bg-card text-foreground shadow-2xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4 text-sm md:h-10",
        xs: "h-8 gap-1 rounded-lg px-2 text-xs",
        sm: "h-9 gap-1.5 rounded-[10px] px-3 text-sm",
        lg: "h-12 gap-2 rounded-xl px-6 text-base font-semibold",
        icon: "size-10 rounded-[10px] md:size-9",
        "icon-xs":
          "size-10 rounded-md md:size-6 [&_svg:not([class*='size-'])]:size-4 md:[&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-10 rounded-lg md:size-8",
        "icon-lg": "size-12 rounded-xl md:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Disables the button and shows a spinner before the children. */
    loading?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children as React.ReactNode}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
