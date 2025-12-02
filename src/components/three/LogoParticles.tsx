// A particle logo that morphs from a dispersed network into the logo silhouette.
// Follows docs/r3f-particles.specs.md

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useImagePoints } from '../../hooks/useImagePoints'

// ---------- GLSL SHADERS ----------

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uPointSize;

  attribute vec3 aLogoPosition;
  attribute vec3 aNetworkPosition;
  attribute float aSeed;
  attribute float aDepth;

  varying float vAlpha;
  varying float vSeed;

  // Simple hash and smooth noise helpers for non-uniform micro motion
  float hash1(float n) {
    return fract(sin(n) * 43758.5453);
  }

  float noise1(float x, float seed) {
    float i = floor(x);
    float f = fract(x);
    float a = hash1(i + seed);
    float b = hash1(i + 1.0 + seed);
    float s = f * f * (3.0 - 2.0 * f);
    return mix(a, b, s);
  }

  // Smoother morph curve than linear; eases in/out
  float easeCubic(float t) {
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec3 fromPos = aNetworkPosition;
    vec3 toPos = aLogoPosition;

    float m = easeCubic(clamp(uMorph, 0.0, 1.0));

    // Gentle, very slow drift seeded per particle (minimize shimmer)
    // Persistent micro-drift; higher when dispersed, but never zero so logo breathes
    // Larger base amplitude so motion is clearly visible in final logo state
    float driftAmp = 0.055 + 0.12 * (1.0 - m);

    // Per-particle frequencies, phases, and amplitudes to avoid lockstep motion
    float fx = 0.42 + 0.55 * fract(sin(aSeed * 12.34));
    float fy = 0.38 + 0.52 * fract(sin(aSeed * 45.67));
    float fz = 0.41 + 0.50 * fract(sin(aSeed * 89.01));

    float phaseX = aSeed * 23.17;
    float phaseY = aSeed * 47.73;
    float phaseZ = aSeed * 91.91;

    float ampX = driftAmp * (0.65 + 0.7 * fract(sin(aSeed * 321.1)));
    float ampY = driftAmp * (0.65 + 0.7 * fract(sin(aSeed * 654.3)));
    float ampZ = driftAmp * (0.65 + 0.7 * fract(sin(aSeed * 987.5)));

    vec3 drift = vec3(
      sin(uTime * fx + phaseX) * ampX,
      sin(uTime * fy + phaseY) * ampY,
      sin(uTime * fz + phaseZ) * ampZ
    );

    // Add smooth random noise per axis so particles never sync up
    vec3 noiseDrift = vec3(
      noise1(uTime * 0.8, aSeed * 11.3) - 0.5,
      noise1(uTime * 0.72, aSeed * 19.7) - 0.5,
      noise1(uTime * 0.78, aSeed * 27.1) - 0.5
    ) * (driftAmp * 1.05);

    // Add a tiny curl-like swirl to break symmetry further
    vec3 swirl = vec3(
      sin(uTime * 0.45 + aSeed * 5.1),
      cos(uTime * 0.4 + aSeed * 3.7),
      sin(uTime * 0.43 + aSeed * 9.9)
    ) * 0.02;

    drift += noiseDrift + swirl;

    // Fade drift as we approach the logo but keep a small breathing motion
    vec3 pos = mix(fromPos + drift, toPos + drift * 0.35, m);
    pos.z +=  aDepth * mix(1.0, 0.25, m);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Slight per-particle size variation with stable jitter
    float sizeJitter = mix(0.92, 1.12, fract(sin(aSeed * 43758.5453)));
    // Keep size moderate to avoid pixelation; rely on sprite texture for softness
    float distToCamera = max(1.5, -mvPosition.z);
    float baseSize = uPointSize * sizeJitter * (16.0 / distToCamera);
    gl_PointSize = clamp(baseSize, 2.5, 12.0);

    vAlpha = mix(0.55, 1.05, m);
    vSeed = aSeed;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // Use a prefiltered circular sprite texture for consistent soft edges
    float alpha = texture2D(uMap, gl_PointCoord).a * vAlpha;
    // Alpha test to avoid light rings/halos on bright backgrounds
    if (alpha < 0.35) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`

// ---------- SHADER MATERIAL ----------

const LogoParticlesMaterial = shaderMaterial(
  {
    uTime: 0,
    uMorph: 0,
    uPointSize: 3.0,
    uColor: new THREE.Color('#7dd3fc'),
    uMap: null,
  },
  vertexShader,
  fragmentShader,
)

extend({ LogoParticlesMaterial })

export type LogoParticlesProps = {
  imageUrl: string
  pointSize?: number
  color?: string
  layers?: number
  morphOverride?: number // optional external morph (0..1)
  darkBg?: boolean
}

type LogoParticlesMaterialInstance = THREE.ShaderMaterial & {
  uMorph: number
  uTime: number
  uPointSize: number
  uColor: THREE.Color
  uMap: THREE.Texture | null
}

export function LogoParticles({
  imageUrl,
  pointSize = 3.2,
  color,
  layers = 3,
  morphOverride,
  darkBg = true,
}: LogoParticlesProps) {
  // Only change is shade: keep base orange, slightly deeper on light bg
  const particleColor = useMemo(() => {
    if (color) return new THREE.Color(color)
    return new THREE.Color(darkBg ? '#f59e0b' : '#c05a00')
  }, [color, darkBg])

  // Generate a high-res soft circular sprite once (reduces aliasing and keeps fill)
  const spriteMap = useMemo(() => {
    if (typeof document === 'undefined') return null
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grd.addColorStop(0.0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.7, 'rgba(255,255,255,1)')
    grd.addColorStop(1.0, 'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    texture.needsUpdate = true
    return texture
  }, [])

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  const logoPositions = useImagePoints(imageUrl, {
    sampleStep: isMobile ? 5 : 3,
    threshold: 10,
    maxPoints: isMobile ? 2400 : 4200,
    scale: 6.4,
  })

  const materialRefs = useRef<LogoParticlesMaterialInstance[]>([])

  const fallbackPositions = useMemo(() => {
    // simple circle fallback so we render something even if logo is missing
    const count = 400
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2
      const r = 2.5 + Math.sin(i * 0.3) * 0.2
      arr[i * 3 + 0] = Math.cos(t) * r
      arr[i * 3 + 1] = Math.sin(t) * r
      arr[i * 3 + 2] = 0
    }
    return arr
  }, [])

  const { geometry, count } = useMemo(() => {
    const positions = logoPositions ?? fallbackPositions
    if (!positions) return { geometry: null as THREE.BufferGeometry | null, count: 0 }

    const count = positions.length / 3
    const geom = new THREE.BufferGeometry()

    const logoAttr = new THREE.Float32BufferAttribute(positions, 3)

    // Network attribute: random points in a sphere
    const networkPositions = new Float32Array(positions.length)
    const seeds = new Float32Array(count)
    const depths = new Float32Array(count)
    const radius = 4.0
    const depthRange = 0.85

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const seed = Math.random()
      const u = Math.random()
      const v = Math.random()
      const theta = 2.0 * Math.PI * u
      const phi = Math.acos(2.0 * v - 1.0)
      const r = radius * Math.cbrt(Math.random())

      networkPositions[i3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      networkPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      networkPositions[i3 + 2] = r * Math.cos(phi)
      seeds[i] = seed
      depths[i] = (Math.random() - 0.5) * depthRange
    }

    const networkAttr = new THREE.Float32BufferAttribute(networkPositions, 3)
    const seedAttr = new THREE.Float32BufferAttribute(seeds, 1)
    const depthAttr = new THREE.Float32BufferAttribute(depths, 1)

    // Dummy position attribute required by Three.js Points
    const positionAttr = new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3)

    geom.setAttribute('position', positionAttr)
    geom.setAttribute('aLogoPosition', logoAttr)
    geom.setAttribute('aNetworkPosition', networkAttr)
    geom.setAttribute('aSeed', seedAttr)
    geom.setAttribute('aDepth', depthAttr)

    return { geometry: geom, count }
  }, [logoPositions, fallbackPositions])

  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  const startTimeRef = useRef<number | null>(null)
  const layersArr = useMemo(
    () => Array.from({ length: layers }, (_, i) => ({ id: `layer-${i}` })),
    [layers],
  )

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (startTimeRef.current === null) startTimeRef.current = t
    const localTime = t - startTimeRef.current

    const morph = morphOverride ?? Math.min(1, localTime / 4.5) // slower morph or externally driven
    const easedMorph = morph ** 1.1

    materialRefs.current.forEach((mat) => {
      if (!mat) return
      mat.uTime = localTime
      mat.uMorph = easedMorph
      mat.uPointSize = pointSize
      mat.uColor = particleColor
      mat.uMap = spriteMap
    })
  })

  if (!geometry || !count) return null

  return (
    <>
      {layersArr.map((layer, idx) => {
        const depth = (idx - (layers - 1) / 2) * 1.0
        const scale = 1 + (idx - (layers - 1) / 2) * 0.12
        const opacity = 1 - Math.abs(idx - (layers - 1) / 2) * 0.12
        const rotation = (idx - (layers - 1) / 2) * 0.045
        return (
          <points
            key={layer.id}
            geometry={geometry}
            position={[0, 0, depth]}
            scale={[scale, scale, scale]}
            rotation={[0, rotation, 0]}
          >
            {/* @ts-ignore intrinsic registered via extend */}
            <logoParticlesMaterial
              ref={(m: LogoParticlesMaterialInstance | null) => {
                if (m) materialRefs.current[idx] = m
              }}
              transparent
              depthWrite={false}
              depthTest={true}
              blending={darkBg ? THREE.AdditiveBlending : THREE.NormalBlending}
              toneMapped={false}
              uColor={particleColor}
              uMorph={0}
              uPointSize={pointSize}
              uMap={spriteMap}
              uTime={0}
              opacity={opacity}
            />
          </points>
        )
      })}
    </>
  )
}

export default LogoParticles
