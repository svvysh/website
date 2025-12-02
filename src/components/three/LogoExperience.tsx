// Composes the logo particles and surrounding network into one scene.

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { usePointerNormalized } from '../../hooks/usePointerNormalized'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { LogoParticles } from './LogoParticles'

type ExperienceProps = {
  logoColor?: string
  darkBg?: boolean
}

export default function LogoExperience({ logoColor, darkBg }: ExperienceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const scrollProgress = useScrollProgress()
  const pointer = usePointerNormalized()
  const targetRot = useRef({ x: 0, y: 0 })

  // Gentle vertical drift for the entire assembly
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    const baseY = Math.sin(t * 0.25) * 0.1
    // Pointer parallax (smoothed)
    const px = pointer.x
    const py = pointer.y
    targetRot.current.y = 0.14 * px
    targetRot.current.x = -0.1 * py
    groupRef.current.rotation.y += (targetRot.current.y - groupRef.current.rotation.y) * 0.08
    groupRef.current.rotation.x += (targetRot.current.x - groupRef.current.rotation.x) * 0.08

    // Parallax position shift (keeps it subtle)
    groupRef.current.position.x = 0.9 + px * 0.18
    groupRef.current.position.y = baseY + py * 0.12
  })

  // Morph responds immediately to scroll (0..1 of first viewport height)
  const t = Math.max(0, Math.min(1, scrollProgress))
  const morph = Math.max(0, 1 - t ** 1.05)

  const pointSize = darkBg ? 3.0 : 3.9

  return (
    <group ref={groupRef} position={[0.9, -0.15, 0]}>
      <LogoParticles
        imageUrl="/logo.png"
        {...(logoColor ? { color: logoColor } : {})}
        layers={3}
        morphOverride={morph}
        pointSize={pointSize}
        darkBg={darkBg ?? false}
      />
    </group>
  )
}
