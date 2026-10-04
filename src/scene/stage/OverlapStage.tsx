import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { layoutModel } from '../../ui/layoutModel'
import { Line } from '@react-three/drei'
import { universe } from '../../data'
import { overlap } from '../../sim/overlap'
import { displayName } from '../../ui/names'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import type { Vec3 } from '../camera'
import { Callout } from '../Callout'
import { basketSpec, basketVoxels } from '../layout/basket'
import { layerCentroid } from '../layout/stages'
import type { Quality } from '../quality'
import { ACCENT_COLORS, holdingColor } from '../palette'
import { atPlaza } from './plaza'

const XA = -7
const XB = 7
const EXPLODE_T = 1
const LABEL_DX = 6
const LABEL_DX_MOBILE = 1.5
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

/** 標註只標重疊最多的前兩家，放在籃子外側（引線往外拉），不壓在發光線上 */
const MAX_LABELS = 2
const NAME_Z = 6

/** 兩檔 ETF 一起拆開，發光線連起同一家公司的地層；籃子下方用暱稱標名 */
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
  const size = useThree((st) => st.size)
  // 手機畫面窄：標註離籃子近一點，才不會超出畫面左右邊
  const dx = layoutModel(size.width, size.height).mobile ? LABEL_DX_MOBILE : LABEL_DX
  const labeled = [...links].sort((x, y) => y.shared - x.shared).slice(0, MAX_LABELS)
  return (
    <>
      <Basket productId={a} quality={BASKET_QUALITY} position={atPlaza(XA, 0, 0)} slice={0} sliceAxis="x" explode={EXPLODE_T} />
      <Basket productId={b} quality={BASKET_QUALITY} position={atPlaza(XB, 0, 0)} slice={0} sliceAxis="x" explode={EXPLODE_T} />
      {links.map((l) => (
        <Line key={l.id} points={[l.pa, l.pb]} color={ACCENT_COLORS.coin} lineWidth={4} transparent opacity={0.9} depthTest={false} renderOrder={10} />
      ))}
      {labeled.map((l, i) => {
        // 第一家標在左籃外側、第二家標在右籃外側
        const left = i % 2 === 0
        const anchor = left ? l.pa : l.pb
        return (
          <Callout
            key={l.id}
            anchor={anchor}
            offset={[left ? -dx : dx, 0, 0]}
            title={T.overlapLabel(universe.get(l.id)!.name)}
            // 色點＝那一層在籃子裡的顏色（3b1b 顏色連結）
            color={holdingColor(universe, left ? a : b, l.id)}
            persistent
          />
        )
      })}
      {[
        { id: a, x: XA },
        { id: b, x: XB },
      ].map((p) => (
        <Callout key={p.id} anchor={atPlaza(p.x, 0.1, NAME_Z)} offset={[0, 0, 0]} title={displayName(universe, p.id)} persistent />
      ))}
    </>
  )
}
