import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MeshStandardMaterial } from 'three'
import type { MaterialKind } from './palette'

/** 場景環境光很弱（避免洗白海面與霧面方塊）；金屬／金色改用自己的環境貼圖與較高強度 */
function EnvMetal({ roughness, metalness, intensity }: { roughness: number; metalness: number; intensity: number }) {
  const ref = useRef<MeshStandardMaterial>(null)
  const scene = useThree((s) => s.scene)
  useFrame(() => {
    const m = ref.current
    if (m && scene.environment && m.envMap !== scene.environment) {
      m.envMap = scene.environment
      m.needsUpdate = true
    }
  })
  return <meshStandardMaterial ref={ref} roughness={roughness} metalness={metalness} envMapIntensity={intensity} />
}

/** 實際顏色由 InstancedMesh 的 instanceColor 提供，這裡只決定質感 */
export function BlockMaterial({ kind }: { kind: MaterialKind }) {
  switch (kind) {
    case 'matte':
      return <meshStandardMaterial roughness={0.8} metalness={0} />
    case 'metal':
      return <EnvMetal roughness={0.35} metalness={0.7} intensity={2} />
    case 'diamond':
      return <meshPhysicalMaterial roughness={0.05} metalness={0} transmission={0.6} thickness={0.5} ior={2.4} />
    case 'glass':
      return <meshPhysicalMaterial roughness={0.15} transmission={0.5} thickness={0.3} transparent opacity={0.85} />
    case 'gold':
      return <EnvMetal roughness={0.25} metalness={1} intensity={1.5} />
  }
}
