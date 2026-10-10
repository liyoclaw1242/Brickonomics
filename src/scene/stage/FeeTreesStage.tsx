import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { universe } from '../../data'
import { FEE_DRAG } from '../../sim/feeDrag'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { TreeCrown } from '../events/SunnyTree.tsx'
import { FEE_TREES, feeTreesNow } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'

const KEYS = ['active', 'passive'] as const
const pct2 = (r: number) => `${Number((r * 100).toFixed(2))}%`

/** 兩檔的內扣費用（資料；查證狀態由 stepMarks 標 ？） */
export const feeTreeFees = () => ({
  active: universe.get(FEE_DRAG.active)?.fees?.expenseRatio ?? 0,
  passive: universe.get(FEE_DRAG.passive)?.fees?.expenseRatio ?? 0,
})

/**
 * a-fee30 主動 vs 被動 30 年：兩座塔像兩棵樹（天氣是 scene.event sunnyTree），拖經過年數一起長高。
 * 扣費前報酬一樣（示意 6%）：每座塔頂上一頂紅色帽子＝費用吃掉的，塔＋帽子永遠一樣高（＝完全沒費用時），所以只差在費用。
 */
export function FeeTreesStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const now = feeTreesNow(periods, feeTreeFees())
  const towers = { active: useRef<Mesh>(null), passive: useRef<Mesh>(null) }
  const caps = { active: useRef<Mesh>(null), passive: useRef<Mesh>(null) }
  const crowns = { active: useRef<Group>(null), passive: useRef<Group>(null) }
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.years, invalidate])
  const grow = useCallback(() => 0.35 + (0.65 * now.years) / FEE_DRAG.years, [now.years])
  const { w: W, unit } = FEE_TREES

  useFrame(() => {
    for (const k of KEYS) {
      const x = FEE_TREES.x[k]
      const h = now[k].value * unit
      const lost = now[k].lost * unit
      towers[k].current?.scale.set(W, h, W)
      towers[k].current?.position.set(...atPlaza(x, h / 2, 0))
      const c = caps[k].current
      if (c) {
        c.visible = lost > 1e-3
        c.scale.set(W, Math.max(0.001, lost), W)
        c.position.set(...atPlaza(x, h + lost / 2, 0))
      }
      crowns[k].current?.position.set(...atPlaza(x, h + lost - 0.2, 0))
    }
  })

  return (
    <>
      {KEYS.map((k) => {
        const x = FEE_TREES.x[k]
        const t = now[k]
        return (
          <group key={k}>
            <mesh ref={towers[k]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={ACCENT_COLORS[k]} roughness={0.7} />
            </mesh>
            <mesh ref={caps[k]} visible={false}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={ACCENT_COLORS.loss} transparent opacity={0.6} roughness={0.8} />
            </mesh>
            <group ref={crowns[k]}>
              <TreeCrown radius={FEE_TREES.crown} grow={grow} quality={quality} />
            </group>
            <Callout
              anchor={atPlaza(x, 0.1, W / 2)}
              offset={[k === 'active' ? -0.6 : 0.6, -0.3, 2.4]}
              title={T.fee30[k](pct2(t.fee))}
              sub={T.wan(t.value)}
              color={ACCENT_COLORS[k]}
              persistent
            />
          </group>
        )
      })}
      {now.active.lost > 0.5 && (
        <Callout
          anchor={atPlaza(FEE_TREES.x.active + W / 2, (now.active.value + now.active.lost / 2) * unit, 0)}
          offset={[1.4, -1.2, 0]}
          title={T.fee30.lost}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
      <Callout anchor={atPlaza(0, 0.1, W / 2)} offset={[0, -0.3, 6]} title={T.fee30.base(`${Number((FEE_DRAG.grossReturn * 100).toFixed(1))}%`)} persistent />
    </>
  )
}
