import { useMemo } from 'react'
import { universe } from '../data'
import { productLooks, type BlockLook } from './palette'
import type { Universe } from '../data/universe'
import type { Quality } from './quality'
import { basketSpec, basketVoxels } from './layout/basket'
import {
  cutThreshold, damagedVoxels, explodeGap, layersFor, sizeAlong,
  type CutSpec, type SliceAxis, type Voxel,
} from './layout/voxels'
import { VoxelInstances } from './VoxelInstances'
import { LaserPlane } from './LaserPlane'

const NO_DAMAGE: ReadonlySet<Voxel> = new Set()

export type BasketProps = {
  productId: string
  quality: Quality
  position: [number, number, number]
  slice: number
  sliceAxis: SliceAxis
  explode: number
  /** 被選取的持股（優先鮮豔） */
  highlightId?: string | null
  /** 導覽焦點持股：鮮豔，其餘低飽和 */
  focusIds?: string[]
  /** 持股 id → 受損比例（情境衝擊）：該組最上方的方塊染紅、不可點選；呼叫端請 memo */
  damage?: Readonly<Record<string, number>>
  onPick?: (holdingId: string) => void
  /** 從哪個 universe 讀籃子（預設全域資料；實戰課的體檢塔用自己的小 universe，見 layout/practice checkupBasket） */
  u?: Universe
  /** 每一層的顏色（預設依資產類型 productLooks）；長度要等於持股數 */
  looks?: readonly BlockLook[]
}

/** 純 props 的籃子：ETF 是立方體，基金是小塔；可同時出現多個 */
export function Basket({ productId, quality, position, slice, sliceAxis, explode, highlightId = null, focusIds, damage, onPick, u = universe, looks: looksOverride }: BasketProps) {
  const product = u.get(productId)
  if (!product?.holdings) throw new Error(`not a basket: ${productId}`)
  const holdings = product.holdings
  const spec = basketSpec(u, productId, quality)
  const layers = layersFor(spec.total, spec.w, spec.d)

  const looks = useMemo(() => (looksOverride ? [...looksOverride] : productLooks(u, productId)), [u, productId, looksOverride])
  const voxels = useMemo(() => basketVoxels(u, productId, spec), [u, productId, spec])
  const damaged = useMemo(() => (damage ? damagedVoxels(voxels, damage) : NO_DAMAGE), [voxels, damage])
  const cut = useMemo<CutSpec | null>(
    () => (slice > 0 ? { axis: sliceAxis, threshold: cutThreshold(sizeAlong(sliceAxis, spec.w, spec.d, layers), slice) } : null),
    [slice, sliceAxis, spec, layers],
  )
  const focusGroups = useMemo(
    () => (focusIds ?? []).map((id) => holdings.findIndex((h) => h.id === id)).filter((i) => i >= 0),
    [focusIds, holdings],
  )
  const idx = highlightId ? holdings.findIndex((h) => h.id === highlightId) : -1

  return (
    <group position={position}>
      <VoxelInstances
        voxels={voxels}
        looks={looks}
        w={spec.w}
        d={spec.d}
        explode={explode}
        cut={cut}
        damaged={damaged}
        quality={quality}
        focusGroups={focusGroups}
        picked={idx >= 0 ? idx : null}
        onPick={onPick ? (g) => onPick(holdings[g]!.id) : undefined}
      />
      {cut && !(cut.axis === 'y' && explode > 0) && (
        <LaserPlane cut={cut} w={spec.w} d={spec.d} height={layers + explodeGap(holdings.length) * (holdings.length - 1) * explode} />
      )}
    </group>
  )
}
