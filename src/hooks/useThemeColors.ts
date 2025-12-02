import { useEffect, useState } from 'react'

type Palette = {
  primary: string
  mutedFg: string
  foreground: string
  background: string
}

const FALLBACK: Palette = {
  primary: '#f59e0b', // orange-ish
  mutedFg: '#6b7280',
  foreground: '#111827',
  background: '#f9fafb',
}

function readVar(name: string): string | null {
  if (typeof window === 'undefined') return null
  const val = getComputedStyle(document.documentElement).getPropertyValue(name)
  return val?.trim() || null
}

function hslVarToHex(value: string | null): string | null {
  if (!value) return null
  // Expecting formats like "40 100% 60%" (from our CSS)
  const parts = value.split(/\s+/)
  if (parts.length < 3) return null
  const [hRaw, sRaw, lRaw] = parts
  if (!hRaw || !sRaw || !lRaw) return null
  const h = parseFloat(hRaw)
  const s = parseFloat(sRaw)
  const l = parseFloat(lRaw)
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null
  const s01 = s / 100
  const l01 = l / 100

  const c = (1 - Math.abs(2 * l01 - 1)) * s01
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l01 - c / 2
  let r = 0,
    g = 0,
    b = 0
  if (h >= 0 && h < 60) {
    ;[r, g, b] = [c, x, 0]
  } else if (h < 120) {
    ;[r, g, b] = [x, c, 0]
  } else if (h < 180) {
    ;[r, g, b] = [0, c, x]
  } else if (h < 240) {
    ;[r, g, b] = [0, x, c]
  } else if (h < 300) {
    ;[r, g, b] = [x, 0, c]
  } else {
    ;[r, g, b] = [c, 0, x]
  }
  const toHex = (v: number) => Math.round((v + m) * 255)
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(toHex(r))}${hex(toHex(g))}${hex(toHex(b))}`
}

export function useThemeColors(): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK)

  useEffect(() => {
    const readPalette = () => {
      const primary = hslVarToHex(readVar('--primary')) || FALLBACK.primary
      const mutedFg = hslVarToHex(readVar('--muted-foreground')) || FALLBACK.mutedFg
      const foreground = hslVarToHex(readVar('--foreground')) || FALLBACK.foreground
      const background = hslVarToHex(readVar('--background')) || FALLBACK.background
      setPalette({ primary, mutedFg, foreground, background })
    }

    readPalette()

    // React to theme toggles (.dark class changes)
    const observer = new MutationObserver(readPalette)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return palette
}
