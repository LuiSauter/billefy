import * as React from "react"

/**
 * Shared keyboard behavior for radio-like button groups (roving tabindex +
 * arrow/Home/End navigation). Used by SegmentedControl and ChipRadioGroup.
 */
export function useRovingRadio<T extends string>(
  options: ReadonlyArray<{ value: T }>,
  value: T,
  onChange: (value: T) => void
) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = options.length - 1
    let next: number | null = null
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
    }
    if (next === null) return
    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return {
    tabbableIndex,
    onKeyDown,
    setRef: (index: number) => (node: HTMLButtonElement | null) => {
      refs.current[index] = node
    },
  }
}
