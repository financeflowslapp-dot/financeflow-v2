import { useEffect, useRef, useState } from 'react'

// Animates a numeric value from its previous value to `target` over `duration` ms.
// Falls back instantly (no animation) on first mount so cards don't count up from 0
// on every page load — only animates when the value actually changes.
export function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const frameRef = useRef(null)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      prevRef.current = target
      setDisplay(target)
      return
    }
    const from = prevRef.current
    const to = Number.isFinite(target) ? target : 0
    if (from === to) return
    const start = performance.now()
    cancelAnimationFrame(frameRef.current)

    function tick(now) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = to
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return display
}
