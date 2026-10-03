import { useMemo } from 'react'
import { universe } from '../data'
import { allocateBlocks } from '../sim/allocate'
import { useSandbox, effectiveExplode } from '../store/sandbox'
import { productLooks } from './palette'
import { QUALITY, type Quality } from './quality'
import { cutThreshold, explodeGap, layersFor, sizeAlong, stackVoxels, type CutSpec } from './layout/voxels'
import { VoxelInstances } from './VoxelInstances'
import { LaserPlane } from './LaserPlane'

type Props = { productId: string; quality: Quality; position: [number, number, number] }

/** 把 ETF／基金換算成方塊：ETF 是立方體，基金是小塔；方塊數嚴格依權重。 */
export function BasketView({ productId, quality, position }: Props) {
  const product = universe.get(productId)
  if (!product?.holdings) throw new Error(`not a basket: ${productId}`)
  const holdings = product.holdings
  const spec = product.type === 'etf' ? QUALITY[quality].etf : QUALITY[quality].fund
  const layers = layersFor(spec.total, spec.w, spec.d)

  const looks = useMemo(() => productLooks(universe, productId), [productId])
  const voxels = useMemo(
    () => stackVoxels(allocateBlocks(holdings.map((h) => ({ id: h.id, weight: h.weightPct })), spec.total), spec.w, spec.d),
    [holdings, spec],
  )

  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)

  const cut = useMemo<CutSpec | null>(
    () => (slice > 0 ? { axis: sliceAxis, threshold: cutThreshold(sizeAlong(sliceAxis, spec.w, spec.d, layers), slice) } : null),
    [slice, sliceAxis, spec, layers],
  )
  const idx = picked?.productId === productId ? holdings.findIndex((h) => h.id === picked.holdingId) : -1

  return (
    <group position={position}>
      <VoxelInstances
        voxels={voxels}
        looks={looks}
        w={spec.w}
        d={spec.d}
        explode={explode}
        cut={cut}
        highlightGroup={idx >= 0 ? idx : null}
        onPick={(g) => pick({ productId, holdingId: holdings[g]!.id })}
      />
      {cut && !(cut.axis === 'y' && explode > 0) && (
        <LaserPlane
          cut={cut}
          w={spec.w}
          d={spec.d}
          height={layers + explodeGap(holdings.length) * (holdings.length - 1) * explode}
        />
      )}
    </group>
  )
}
