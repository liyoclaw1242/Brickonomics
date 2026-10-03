import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MeshStandardMaterial } from 'three'
import type { MaterialKind } from './palette'
import type { Quality } from './quality'

/** 場景環境光很弱（避免洗白海面與霧面方塊）；金屬／金色改用自己的環境貼圖與較高強度 */
function EnvMetal({
  roughness,
  metalness,
  intensity,
  color,
  opacity = 1,
}: {
  roughness: number
  metalness: number
  intensity: number
  color?: string
  opacity?: number
}) {
  const ref = useRef<MeshStandardMaterial>(null)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    if (!scene.environment) {
      invalidate() // 環境貼圖還沒好：繼續要幀直到它出現
      return
    }
    if (m.envMap !== scene.environment) {
      m.envMap = scene.environment
      m.needsUpdate = true
      invalidate() // 指派後補畫一幀
    }
  })
  return (
    <meshStandardMaterial
      ref={ref}
      color={color}
      roughness={roughness}
      metalness={metalness}
      envMapIntensity={intensity}
      transparent={opacity < 1}
      opacity={opacity}
    />
  )
}

/** 實體方塊：顏色由 InstancedMesh 的 instanceColor 提供（不傳 color → 白底 × instanceColor）；單一 mesh 可傳 color／opacity */
export function BlockMaterial({
  kind,
  quality,
  color,
  opacity = 1,
}: {
  kind: MaterialKind
  quality: Quality
  color?: string
  opacity?: number
}) {
  const fade = opacity < 1
  switch (kind) {
    case 'matte':
      return <meshStandardMaterial color={color} roughness={0.8} metalness={0} transparent={fade} opacity={opacity} />
    case 'metal':
      return <EnvMetal color={color} roughness={0.35} metalness={0.7} intensity={2} opacity={opacity} />
    case 'diamond':
      // 低畫質不用 transmission（會多一次場景渲染）：改用半透明標準材質
      if (quality === 'low')
        return <meshStandardMaterial color={color} roughness={0.1} metalness={0.3} transparent opacity={0.8 * opacity} />
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.05}
          metalness={0}
          transmission={0.6}
          thickness={0.5}
          ior={2.4}
          transparent={fade}
          opacity={opacity}
        />
      )
    case 'glass':
      if (quality === 'low')
        return <meshStandardMaterial color={color} roughness={0.2} metalness={0} transparent opacity={0.78 * opacity} />
      return (
        <meshPhysicalMaterial color={color} roughness={0.15} transmission={0.5} thickness={0.3} transparent opacity={0.85 * opacity} />
      )
    case 'gold':
      return <EnvMetal color={color} roughness={0.25} metalness={1} intensity={1.5} opacity={opacity} />
  }
}
