import type { MaterialKind } from './palette'

/** 實際顏色由 InstancedMesh 的 instanceColor 提供，這裡只決定質感 */
export function BlockMaterial({ kind }: { kind: MaterialKind }) {
  switch (kind) {
    case 'matte':
      return <meshStandardMaterial roughness={0.8} metalness={0} />
    case 'metal':
      return <meshStandardMaterial roughness={0.35} metalness={0.7} />
    case 'diamond':
      return <meshPhysicalMaterial roughness={0.05} metalness={0} transmission={0.6} thickness={0.5} ior={2.4} />
    case 'glass':
      return <meshPhysicalMaterial roughness={0.15} transmission={0.5} thickness={0.3} transparent opacity={0.85} />
    case 'gold':
      return <meshStandardMaterial roughness={0.25} metalness={1} />
  }
}
