import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import type { Mesh } from 'three'
import { REBALANCE } from '../../sim/rebalance'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { REBAL_LAYOUT, rebalNow, rebalTower } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const { x: X, w: W } = REBAL_LAYOUT
const pct0 = (v: number) => `${Math.round(v)}%`

/**
 * a-rebal 剪高補低：一座組合塔（股票在下、債券在上），一條目標線在「股票該到的高度」（總高 × 60%）。
 * 拖進度：一開始股票剛好到線；股票漲了一年，股票那截超過線（長歪了，超過的那段用紅框標出）；剪高補低：總高不變，把超過的那段搬到債券，股票回到線上。
 */
export function RebalanceStage() {
  const v = useTour((s) => s.values.rebal)
  const n = rebalNow(v)
  const t = rebalTower(v)
  const theme = THEMES[useThemeStore((s) => s.theme)]
  const stock = useRef<Mesh>(null)
  const bond = useRef<Mesh>(null)
  const target = useRef<Mesh>(null)
  const extra = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [n.stage, invalidate])

  useFrame(() => {
    stock.current?.scale.set(W, t.stock, W)
    stock.current?.position.set(...atPlaza(X, t.stock / 2, 0))
    bond.current?.scale.set(W, t.bond, W)
    bond.current?.position.set(...atPlaza(X, t.stock + t.bond / 2, 0))
    target.current?.position.set(...atPlaza(X, t.target, 0))
    // 股票超過目標線的那一段（長歪的部分）：亮一點的框
    const e = extra.current
    if (e) {
      const over = t.stock - t.target
      e.visible = over > 1e-3
      e.scale.set(W + 0.15, Math.max(0.001, over), W + 0.15)
      e.position.set(...atPlaza(X, t.target + over / 2, 0))
    }
  })

  return (
    <>
      <mesh ref={stock} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.stock} roughness={0.75} />
      </mesh>
      <mesh ref={bond} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.bond} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh ref={extra} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ACCENT_COLORS.stock} transparent opacity={0.35} depthWrite={false} />
        <Edges color={ACCENT_COLORS.loss} />
      </mesh>
      {/* 目標線：一圈細框（比塔寬一點），只畫框線 */}
      <mesh ref={target}>
        <boxGeometry args={[W + 0.8, 0.02, W + 0.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={theme.calloutLine} />
      </mesh>
      <Callout
        anchor={atPlaza(X - W / 2, t.stock / 2, 0)}
        offset={[-2.6, 0, 0]}
        title={T.rebal.stock(T.wan(n.stock), pct0(n.stockPct))}
        color={ACCENT_COLORS.stock}
        persistent
      />
      <Callout anchor={atPlaza(X - W / 2, t.stock + t.bond / 2, 0)} offset={[-2.6, 0.4, 0]} title={T.rebal.bond(T.wan(n.bond))} color={ACCENT_COLORS.bond} persistent />
      <Callout
        anchor={atPlaza(X + W / 2 + 0.6, t.target, 0)}
        offset={[2.4, 0, 0]}
        title={T.rebal.target(REBALANCE.targetStockPct)}
        sub={n.moved > 0 ? T.rebal.moved(T.wan(n.moved)) : undefined}
        persistent
      />
    </>
  )
}
