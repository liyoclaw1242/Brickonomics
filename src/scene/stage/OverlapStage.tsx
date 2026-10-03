import { useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { universe } from '../../data'
import { overlap } from '../../sim/overlap'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import type { Vec3 } from '../camera'
import { labelStyle } from '../labelStyle'
import { basketSpec, basketVoxels } from '../layout/basket'
import { layerCentroid } from '../layout/stages'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const XA = -9
const XB = 9

function centroidOf(productId: string, holdingId: string, quality: Quality, baseX: number): Vec3 | null {
  const p = universe.get(productId)!
  const group = p.holdings!.findIndex((h) => h.id === holdingId)
  const spec = basketSpec(universe, productId, quality)
  const c = layerCentroid(basketVoxels(universe, productId, spec), group, spec.w, spec.d, 1, p.holdings!.length)
  if (!c) return null
  const base = atPlaza(baseX, 0, 0)
  return [base[0] + c[0], base[1] + c[1], base[2] + c[2]]
}

/** 兩檔 ETF 一起拆開，發光線連起同一家公司的地層 */
export function OverlapStage({ a, b, quality }: { a: string; b: string; quality: Quality }) {
  const ready = useAfterFirstTick()
  const links = useMemo(
    () =>
      overlap(universe, a, b).rows.flatMap((r) => {
        const pa = centroidOf(a, r.id, quality, XA)
        const pb = centroidOf(b, r.id, quality, XB)
        return pa && pb ? [{ id: r.id, pa, pb, shared: r.shared }] : []
      }),
    [a, b, quality],
  )
  return (
    <>
      <Basket productId={a} quality={quality} position={atPlaza(XA, 0, 0)} slice={0} sliceAxis="x" explode={1} />
      <Basket productId={b} quality={quality} position={atPlaza(XB, 0, 0)} slice={0} sliceAxis="x" explode={1} />
      {links.map((l) => (
        <Line key={l.id} points={[l.pa, l.pb]} color="#ffd54f" lineWidth={4} transparent opacity={0.9} />
      ))}
      {ready &&
        links.map((l) => (
          <Html key={l.id} position={[(l.pa[0] + l.pb[0]) / 2, (l.pa[1] + l.pb[1]) / 2 + 0.6, (l.pa[2] + l.pb[2]) / 2]} center style={labelStyle}>
            {T.overlapLabel(universe.get(l.id)!.name, `${(l.shared * 100).toFixed(1)}%`)}
          </Html>
        ))}
    </>
  )
}
