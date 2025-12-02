import { useEffect, useState } from 'react'

/**
 * Tracks pointer position normalized to [-1, 1] in both axes, based on window size.
 * Works even if the canvas has pointer-events: none.
 */
export function usePointerNormalized() {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      const x = (e.clientX / w) * 2 - 1
      const y = (e.clientY / h) * 2 - 1
      setPos({ x, y: -y }) // invert y so up is positive
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return pos
}
