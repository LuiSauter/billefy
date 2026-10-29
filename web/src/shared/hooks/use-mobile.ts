import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Tri-state variant: `undefined` until the viewport has been measured on the
 * client (SSR + first render), then `true` (< 768px) or `false`.
 * Use it to avoid hydration flashes of the wrong layout.
 */
export function useIsMobileResolved(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

export function useIsMobile() {
  return !!useIsMobileResolved()
}
