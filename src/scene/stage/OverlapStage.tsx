import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { universe } from '../../data'
import { overlap } from '../../sim/overlap'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import type { Vec3 } from '../camera'
import { Callout } from '../Callout'
import { basketSpec, basketVoxels } from '../layout/basket'
import { layerCentroid } from '../layout/stages'
import type { Quality } from '../quality'
import { ACCENT_COLORS } from '../palette'
import { atPlaza } from './plaza'

const XA = -7
const XB = 7
const EXPLODE_T = 1
const LABEL_DX = 6
const BASKET_QUALITY: Quality = 'low'

type Built = { productId: string; baseX: number; spec: ReturnType<typeof basketSpec>; voxels: ReturnType<typeof basketVoxels> }

function build(productId: string, baseX: number): Built {
  const spec = basketSpec(universe, productId, BASKET_QUALITY)
  return { productId, baseX, spec, voxels: basketVoxels(universe, productId, spec) }
}

function centroidOf(b: Built, holdingId: string): Vec3 | null {
  const p = universe.get(b.productId)!
  const group = p.holdings!.findIndex((h) => h.id === holdingId)
  const c = layerCentroid(b.voxels, group, b.spec.w, b.spec.d, EXPLODE_T, p.holdings!.length)
  if (!c) return null
  const base = atPlaza(b.baseX, 0, 0)
  return [base[0] + c[0], base[1] + c[1], base[2] + c[2]]
}

/** 兩檔 ETF 一起拆開，發光線連起同一家公司的地層 */
export function OverlapStage({ a, b }: { a: string; b: string; quality: Quality }) {
  const links = useMemo(() => {
    const ba = build(a, XA)
    const bb = build(b, XB)
    return overlap(universe, a, b).rows.flatMap((r) => {
      const pa = centroidOf(ba, r.id)
      const pb = centroidOf(bb, r.id)
      return pa && pb ? [{ id: r.id, pa, pb, shared: r.shared }] : []
    })
  }, [a, b])
  return (
    <>
      <Basket productId={a} quality={BASKET_QUALITY} position={atPlaza(XA, 0, 0)} slice={0} sliceAxis="x" explode={EXPLODE_T} />
      <Basket productId={b} quality={BASKET_QUALITY} position={atPlaza(XB, 0, 0)} slice={0} sliceAxis="x" explode={EXPLODE_T} />
      {links.map((l) => (
        <Line key={l.id} points={[l.pa, l.pb]} color={ACCENT_COLORS.coin} lineWidth={4} transparent opacity={0.9} depthTest={false} renderOrder={10} />
      ))}
      {links.map((l, i) => (
        <Callout
          key={l.id}
          anchor={[(l.pa[0] + l.pb[0]) / 2, (l.pa[1] + l.pb[1]) / 2, (l.pa[2] + l.pb[2]) / 2]}
          offset={[i % 2 === 0 ? -LABEL_DX : LABEL_DX, 0.5, 1]}
          title={T.overlapLabel(universe.get(l.id)!.name, `${(l.shared * 100).toFixed(1)}%`)}
        />
      ))}
    </>
  )
}
