// React Three Fiber Canvas wrapper suitable for Astro islands.

import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Suspense } from 'react'
import { useThemeColors } from '../../hooks/useThemeColors'
import LogoExperience from './LogoExperience'

export default function LogoHero() {
  const palette = useThemeColors()

  const bg = palette.background || '#0b0d11'
  // Simple luminance to pick contrasting defaults
  const lum = (() => {
    const c = bg.replace('#', '')
    const r = parseInt(c.substring(0, 2), 16) / 255
    const g = parseInt(c.substring(2, 4), 16) / 255
    const b = parseInt(c.substring(4, 6), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  })()
  const darkBg = lum < 0.5

  // Keep the brand orange in both themes; only shade changes with theme
  const logoColor = palette.primary || (darkBg ? '#f59e0b' : '#c05a00')

  const bloomIntensity = 0.45
  const bloomThreshold = 0.18
  const bloomSmoothing = 0.1

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas camera={{ position: [0, 0, 11], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[bg]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={0.8} />

        <Suspense fallback={null}>
          <LogoExperience logoColor={logoColor} darkBg={darkBg} />
          <EffectComposer enableNormalPass={false}>
            <Bloom
              intensity={bloomIntensity}
              luminanceThreshold={bloomThreshold}
              luminanceSmoothing={bloomSmoothing}
              kernelSize={2}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
