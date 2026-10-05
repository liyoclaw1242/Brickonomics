import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { REBALANCE } from '../../sim/rebalance'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { REBAL_LAYOUT, rebalNow, rebalTower } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const { x: X, w: W, unit } = REBAL_LAYOUT
const pct0 = (v: number) => `${Math.round(v)}%`
/** 塔斜到新角度花的秒數（一次只變一件事：看得到它歪過去、再站直） */
const LEAN_RATE = 4

/**
 * a-rebal 剪高補低：一座組合塔（股票在下、債券在上），一條目標線在「股票該到的高度」（總高 × 60%）。
 * 拖進度：一開始股票剛好到線；一年後股票漲了，股票那截超過線（紅框），整座塔往一邊斜（塔長歪了）；
 * 剪高補低：總高不變，超過的那段搬到債券（債券底下那一截用股票色框出「搬過來的」），塔站直。
 */
export function RebalanceStage() {
  const v = useTour((s) => s.values.rebal)
  const n = rebalNow(v)
  const t = rebalTower(v)
  const theme = THEMES[useThemeStore((s) => s.theme)]
  const tower = useRef<Group>(null)
  const stock = useRef<Mesh>(null)
  const bond = useRef<Mesh>(null)
  const target = useRef<Mesh>(null)
  const extra = useRef<Mesh>(null)
  const moved = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [n.stage, invalidate])

  useFrame((_, dt) => {
    // 塔以底部中心為支點斜過去（平滑趨近，斜完就停止要求重繪）
    const g = tower.current
    if (g) {
      const goal = -t.lean
      const d = goal - g.rotation.z
      g.rotation.z = Math.abs(d) < 1e-3 ? goal : g.rotation.z + d * Math.min(1, dt * LEAN_RATE)
      if (Math.abs(d) >= 1e-3) invalidate()
    }
    stock.current?.scale.set(W, t.stock, W)
    stock.current?.position.set(0, t.stock / 2, 0)
    bond.current?.scale.set(W, t.bond, W)
    bond.current?.position.set(0, t.stock + t.bond / 2, 0)
    target.current?.position.set(0, t.target, 0)
    const e = extra.current
    if (e) {
      const over = t.stock - t.target
      e.visible = over > 1e-3
      e.scale.set(W + 0.15, Math.max(0.001, over), W + 0.15)
      e.position.set(0, t.target + over / 2, 0)
    }
    const m = moved.current
    if (m) {
      const h = n.moved * unit
      m.visible = h > 1e-3
      m.scale.set(W + 0.15, Math.max(0.001, h), W + 0.15)
      m.position.set(0, t.stock + h / 2, 0)
    }
  })

  return (
    <>
      <group ref={tower} position={atPlaza(X, 0, 0)}>
        <mesh ref={stock} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={ACCENT_COLORS.stock} roughness={0.75} />
        </mesh>
        <mesh ref={bond} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={ACCENT_COLORS.bond} roughness={0.5} metalness={0.1} />
        </mesh>
        {/* 超過目標線的股票（長歪的部分） */}
        <mesh ref={extra} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ACCENT_COLORS.stock} transparent opacity={0.35} depthWrite={false} />
          <Edges color={ACCENT_COLORS.loss} />
        </mesh>
        {/* 剪高補低之後：債券底下那一截＝從股票搬過來的 */}
        <mesh ref={moved} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ACCENT_COLORS.stock} transparent opacity={0.3} depthWrite={false} />
          <Edges color={ACCENT_COLORS.stock} />
        </mesh>
        {/* 目標線：一圈細框（比塔寬一點），只畫框線 */}
        <mesh ref={target}>
          <boxGeometry args={[W + 0.8, 0.02, W + 0.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={theme.calloutLine} />
        </mesh>
      </group>
      <Callout
        anchor={atPlaza(X - W / 2, t.stock / 2, 0)}
        offset={[-2.6, 0, 0]}
        title={T.rebal.stock(T.wan(n.stock), pct0(n.stockPct))}
        color={ACCENT_COLORS.stock}
        persistent
      />
      <Callout anchor={atPlaza(X - W / 2, t.stock + t.bond / 2, 0)} offset={[-2.6, 0.6, 0]} title={T.rebal.bond(T.wan(n.bond))} color={ACCENT_COLORS.bond} persistent />
      <Callout
        anchor={atPlaza(X + W / 2 + 0.6, t.target, 0)}
        offset={[2.4, 0, 0]}
        title={T.rebal.target(REBALANCE.targetStockPct)}
        sub={n.stage === 1 ? T.rebal.over : n.moved > 0 ? T.rebal.moved(T.wan(n.moved)) : undefined}
        persistent
      />
    </>
  )
}
