import { useEffect, useState } from 'react'

/**
 * Returns a normalized progress (0..1) of scroll within the first viewport height.
 * Clamps to [0,1]. Updates on scroll/resize.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const h = window.innerHeight || 1
      const p = Math.min(1, Math.max(0, window.scrollY / h))
      setProgress(p)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return progress
}
