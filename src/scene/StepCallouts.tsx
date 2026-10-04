import { useMemo, useState } from 'react'
import { universe } from '../data'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied } from '../tour/engine'
import type { CalloutSpec, TextContext } from '../tour/types'
import type { Vec3 } from './camera'
import { Callout } from './Callout'
import { basketSpec, basketVoxels } from './layout/basket'
import { cityLayout } from './layout/city'
import { layerCentroid } from './layout/stages'
import { colorForKey, holdingColor } from './palette'
import type { Quality } from './quality'
import { prefersReducedMotion, useRevealAfterCamera } from './useRevealAfterCamera'
import { EXCHANGE_POSITION, PEDESTAL_HEIGHT } from './stage/plaza'

const ctx = makeTextContext(universe)
const HOLDING_OFFSET: Vec3 = [4, 1.5, 0]
// 大樓上方留短引線：樓頂本來就在畫面上緣附近，太長會把框推出視窗
const BUILDING_OFFSET: Vec3 = [0, 1.5, 0]

const textOf = (v: CalloutSpec['title'] | undefined, c: TextContext): string | undefined => (typeof v === 'function' ? v(c) : v)

type Resolved = { key: string; anchor: Vec3; offset: Vec3; color: string | undefined; title: string; sub: string | undefined }

/** 導覽步驟的標註：錨在交易所籃子的某層持股，或城市裡的某棟大樓 */
export function StepCallouts({ quality }: { quality: Quality }) {
  const callouts = useTour((s) => currentStep(s).callouts)
  const stepId = useTour((s) => currentStep(s).id)
  const [instant] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(stepId, instant)
  const productId = useSandbox((s) => s.productId)
  const explode = useSandbox(effectiveExplode)
  const slice = useSandbox((s) => s.slice)
  const values = useTour((s) => s.values)
  const placements = useMemo(() => cityLayout([...universe.values()]), [])
  const basket = useMemo(() => {
    const holdings = productId ? universe.get(productId)?.holdings : undefined
    if (!productId || !holdings) return null
    const spec = basketSpec(universe, productId, quality)
    return { productId, holdings, spec, voxels: basketVoxels(universe, productId, spec) }
  }, [productId, quality])

  const resolved = useMemo<Resolved[]>(() => {
    return (callouts ?? []).flatMap((c, i): Resolved[] => {
      // 有 when 的標註等拉桿到位才出現（例如拆開之後才標出每一層）
      if (!isSatisfied(c.when, { ...values, slice, explode })) return []
      const title = textOf(c.title, ctx) ?? ''
      const sub = textOf(c.sub, ctx)
      if (c.anchor.kind === 'holding') {
        if (!basket) return []
        const { holdingId } = c.anchor
        const group = basket.holdings.findIndex((h) => h.id === holdingId)
        if (group < 0) return []
        const p = layerCentroid(basket.voxels, group, basket.spec.w, basket.spec.d, explode, basket.holdings.length)
        if (!p) return []
        // 籃子右側面、該層的高度
        const anchor: Vec3 = [EXCHANGE_POSITION[0] + basket.spec.w / 2 + 0.2, PEDESTAL_HEIGHT + p[1], EXCHANGE_POSITION[2] + p[2]]
        return [{ key: `${i}-${holdingId}`, anchor, offset: HOLDING_OFFSET, color: holdingColor(universe, basket.productId, holdingId), title, sub }]
      }
      const { id } = c.anchor
      const b = placements.find((p) => p.id === id)
      if (!b) return []
      return [{ key: `${i}-${id}`, anchor: [b.x, b.height + 0.2, b.z], offset: BUILDING_OFFSET, color: colorForKey(universe, id), title, sub }]
    })
  }, [callouts, basket, explode, slice, values, placements])

  if (!revealed) return null
  return (
    <>
      {resolved.map((r) => (
        <Callout key={r.key} anchor={r.anchor} offset={r.offset} title={r.title} sub={r.sub} color={r.color} persistent />
      ))}
    </>
  )
}
