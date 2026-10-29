import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[12px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-hidden select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_1px_2px_rgba(37,99,235,0.2)]",
        success: "bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_1px_2px_rgba(16,185,129,0.25)]",
        dark: "bg-[#0F172A] text-white hover:bg-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.2)]",
        outline:
          "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 hover:text-slate-900 shadow-2xs",
        secondary:
          "bg-slate-100 text-[#334155] hover:bg-slate-200",
        ghost:
          "hover:bg-slate-100 hover:text-[#0F172A]",
        destructive:
          "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100",
        link: "text-[#2563EB] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 text-[13px]",
        xs: "h-7 gap-1 rounded-[8px] px-2 text-[11px]",
        sm: "h-8 gap-1.5 rounded-[10px] px-3 text-xs",
        lg: "h-11 gap-2 rounded-[14px] px-5 text-sm font-bold",
        icon: "size-9 rounded-[10px]",
        "icon-xs":
          "size-6 rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[8px]",
        "icon-lg": "size-10 rounded-[12px]",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
