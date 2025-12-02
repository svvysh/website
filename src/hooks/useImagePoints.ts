import { useEffect, useState } from 'react'

export type UseImagePointsOptions = {
  sampleStep?: number
  threshold?: number
  maxPoints?: number
  scale?: number
}

/**
 * Loads an image and samples its opaque pixels into a Float32Array of 3D positions.
 * Runs entirely client-side; safe for Astro/SSR because work happens in useEffect.
 */
export function useImagePoints(
  imageUrl: string,
  options: UseImagePointsOptions = {},
): Float32Array | null {
  const { sampleStep = 4, threshold = 128, maxPoints = 2800, scale = 4 } = options

  const [positions, setPositions] = useState<Float32Array | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl

    img.onload = () => {
      if (cancelled) return

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Could not get 2D context to sample logo image.')
        return
      }

      const width = img.width
      const height = img.height
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      const { data } = ctx.getImageData(0, 0, width, height)
      const raw: number[] = []

      for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
          const idx = (y * width + x) * 4
          const alpha = data[idx + 3]

          if (alpha !== undefined && alpha > threshold) {
            raw.push(x, y)
          }
        }
      }

      if (raw.length === 0) {
        console.warn('Logo sampling produced 0 points. Check alpha/threshold or file path.')
        return
      }

      // Center and scale based on the sampled bounding box (prevents thin line issue on sparse images)
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (let i = 0; i < raw.length; i += 2) {
        const x = raw[i]
        const y = raw[i + 1]
        if (x === undefined || y === undefined) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      const sizeX = maxX - minX || 1
      const sizeY = maxY - minY || 1
      const maxDim = Math.max(sizeX, sizeY)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2

      // If too many points, downsample deterministically to preserve full coverage
      const step = Math.max(1, Math.ceil(raw.length / (maxPoints * 2))) // raw holds x,y so /2 = points
      const tmp: number[] = []
      for (let i = 0; i < raw.length; i += step * 2) {
        const x = raw[i]
        const y = raw[i + 1]
        if (x === undefined || y === undefined) continue
        const nx = ((x - cx) / maxDim) * scale
        const ny = -((y - cy) / maxDim) * scale // flip Y to keep logo upright
        const nz = (Math.random() - 0.5) * 0.12 // tiny z jitter to avoid z-fighting lines
        tmp.push(nx, ny, nz)
      }

      setPositions(new Float32Array(tmp))
    }

    img.onerror = () => {
      console.error('Failed to load logo image for particle sampling:', imageUrl)
    }

    return () => {
      cancelled = true
    }
  }, [imageUrl, sampleStep, threshold, maxPoints, scale])

  return positions
}
