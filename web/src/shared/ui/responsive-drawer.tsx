"use client"

/**
 * ResponsiveDrawer: one API, two presentations.
 *  - viewport < 768px  -> bottom drawer (swipe down / backdrop tap to close)
 *  - viewport >= 768px -> centered modal dialog
 *
 * Renders nothing until the viewport has been measured (no hydration flash).
 *
 * Submitting a form from the sticky footer
 * ----------------------------------------
 * The footer lives OUTSIDE the scrollable body, so it cannot be nested in the
 * body's <form>. Give the form an id and point the footer submit button at it
 * with the HTML `form` attribute:
 *
 *   <ResponsiveDrawer
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="New transaction"
 *     footer={<Button type="submit" form="tx-form">Save</Button>}
 *   >
 *     <form id="tx-form" onSubmit={handleSubmit}>...</form>
 *   </ResponsiveDrawer>
 */

import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/shared/ui/drawer"
import { useIsMobileResolved } from "@/shared/hooks/use-mobile"

type ResponsiveDrawerSize = "sm" | "md" | "lg" | "xl"

type ResponsiveDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Modal width on desktop. Default `md`. */
  size?: ResponsiveDrawerSize
  /** Scrollable body. */
  children: React.ReactNode
  /** Sticky at the bottom in both presentations. */
  footer?: React.ReactNode
  hideCloseButton?: boolean
}

// Literal class names so Tailwind can detect them.
const DESKTOP_WIDTH: Record<ResponsiveDrawerSize, string> = {
  sm: "sm:max-w-[420px]",
  md: "sm:max-w-[520px]",
  lg: "sm:max-w-[680px]",
  xl: "sm:max-w-[860px]",
}

function ResponsiveDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  footer,
  hideCloseButton = false,
}: ResponsiveDrawerProps) {
  const isMobile = useIsMobileResolved()

  if (isMobile === undefined) return null

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        swipeDirection="down"
        showSwipeHandle
      >
        <DrawerContent className="max-h-[92dvh] bg-card data-[swipe-direction=down]:rounded-t-3xl">
          <div className="relative shrink-0 px-5 pt-3 pb-3 pr-16">
            <DrawerTitle className="text-lg leading-snug font-bold text-foreground">
              {title}
            </DrawerTitle>
            {description && (
              <DrawerDescription className="mt-1 text-sm text-balance text-muted-foreground">
                {description}
              </DrawerDescription>
            )}
            {!hideCloseButton && (
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1 right-3 rounded-full text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DrawerClose>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {children}
          </div>
          {footer && (
            <div
              data-slot="responsive-drawer-footer"
              className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 pt-3 pb-safe"
            >
              {footer}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!hideCloseButton}
        className={cn(
          "flex max-h-[min(90dvh,860px)] flex-col gap-0 overflow-hidden rounded-3xl p-0",
          DESKTOP_WIDTH[size]
        )}
      >
        <div className="shrink-0 px-5 pt-3 pb-3 pr-14 md:px-6 md:pt-6">
          <DialogTitle className="text-lg leading-snug font-bold text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">
          {children}
        </div>
        {footer && (
          <div
            data-slot="responsive-drawer-footer"
            className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:justify-end md:px-6"
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { ResponsiveDrawer }
export type { ResponsiveDrawerProps, ResponsiveDrawerSize }
