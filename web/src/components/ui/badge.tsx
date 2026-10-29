import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-blue-200 bg-blue-50 text-blue-700 [a]:hover:bg-blue-100",
        primary: "border-transparent bg-[#2563EB] text-white [a]:hover:bg-blue-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700 [a]:hover:bg-emerald-100",
        warning: "border-amber-200 bg-amber-50 text-amber-700 [a]:hover:bg-amber-100",
        destructive: "border-rose-200 bg-rose-50 text-rose-700 [a]:hover:bg-rose-100",
        p2p: "border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] [a]:hover:bg-blue-100",
        dark: "border-transparent bg-[#0F172A] text-white",
        secondary: "border-slate-200 bg-slate-100 text-slate-700 [a]:hover:bg-slate-200",
        outline: "border-slate-200 bg-white text-slate-700 [a]:hover:bg-slate-50",
        ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
        link: "text-[#2563EB] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
