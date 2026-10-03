import type { Universe } from '../../data/universe'
import { allocateBlocks } from '../../sim/allocate'
import { QUALITY, type BoxSpec, type Quality } from '../quality'
import { stackVoxels, type Voxel } from './voxels'

export function basketSpec(u: Universe, productId: string, quality: Quality): BoxSpec {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return p.type === 'etf' ? QUALITY[quality].etf : QUALITY[quality].fund
}

/** 籃子方塊的唯一來源：方塊數嚴格依權重（最大餘數法） */
export function basketVoxels(u: Universe, productId: string, spec: BoxSpec): Voxel[] {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return stackVoxels(
    allocateBlocks(p.holdings.map((h) => ({ id: h.id, weight: h.weightPct })), spec.total),
    spec.w,
    spec.d,
  )
}
