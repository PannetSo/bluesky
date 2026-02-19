import {useEffect, useRef} from 'react'

/**
 * Auto-scrolls the nearest scrollable container when the pointer is near
 * the top or bottom edge during a drag operation. Web only.
 *
 * Uses a requestAnimationFrame loop with quadratic easing — scroll speed
 * increases as the pointer gets closer to the edge.
 */
export function useAutoScroll(
  isDragging: boolean,
  onScroll?: (scrollTop: number) => void,
) {
  const speedRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  // Ref to avoid restarting the effect when the callback changes.
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll

  useEffect(() => {
    if (!isDragging) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      speedRef.current = 0
      containerRef.current = null
      return
    }

    const el = findScrollableAncestor(document.getElementById('content'))
    if (!el) return
    containerRef.current = el

    const tick = () => {
      if (speedRef.current !== 0 && containerRef.current) {
        containerRef.current.scrollTop += speedRef.current
        onScrollRef.current?.(containerRef.current.scrollTop)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // Block wheel-scroll during drag to prevent conflicts with auto-scroll.
    const blockWheel = (e: WheelEvent) => e.preventDefault()
    window.addEventListener('wheel', blockWheel, {passive: false})

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      window.removeEventListener('wheel', blockWheel)
    }
  }, [isDragging])

  const updatePointerY = (clientY: number) => {
    const el = containerRef.current
    if (!el) return

    const threshold = 100
    const maxSpeed = 15

    // For <body>/<html>, the visible area is the window viewport.
    const isDocScroller =
      el === document.body || el === document.documentElement
    const top = isDocScroller ? 0 : el.getBoundingClientRect().top
    const bottom = isDocScroller
      ? window.innerHeight
      : el.getBoundingClientRect().bottom
    const distFromTop = clientY - top
    const distFromBottom = bottom - clientY

    if (distFromTop < threshold) {
      const ratio = 1 - distFromTop / threshold
      speedRef.current = -maxSpeed * ratio * ratio
    } else if (distFromBottom < threshold) {
      const ratio = 1 - distFromBottom / threshold
      speedRef.current = maxSpeed * ratio * ratio
    } else {
      speedRef.current = 0
    }
  }

  return {updatePointerY}
}

/** Walk up from `el` to find the first ancestor with overflow scroll/auto. */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let current = el
  while (current) {
    // In standards mode, body.scrollTop is a no-op even if body has
    // overflow:scroll — the real scroller is document.scrollingElement.
    if (current === document.body || current === document.documentElement) {
      return (document.scrollingElement as HTMLElement) ?? current
    }
    const {overflowY} = window.getComputedStyle(current)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return (document.scrollingElement as HTMLElement) ?? null
}
