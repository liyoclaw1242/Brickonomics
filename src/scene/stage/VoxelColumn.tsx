import { useMemo } from 'react'
import type { Vec3 } from '../camera'
import type { BlockLook } from '../palette'
import type { Quality } from '../quality'
import { towerVoxels } from '../layout/stages'
import { VoxelInstances } from '../VoxelInstances'

/** 單色方塊柱（用方塊數表示金額） */
export function VoxelColumn({ count, look, position, w = 5, d = 5, quality }: { count: number; look: BlockLook; position: Vec3; w?: number; d?: number; quality: Quality }) {
  const voxels = useMemo(() => towerVoxels(count, w, d), [count, w, d])
  const looks = useMemo(() => [look], [look])
  if (count === 0) return null
  return (
    <group position={position}>
      <VoxelInstances voxels={voxels} looks={looks} w={w} d={d} explode={0} cut={null} picked={null} quality={quality} />
    </group>
  )
}
