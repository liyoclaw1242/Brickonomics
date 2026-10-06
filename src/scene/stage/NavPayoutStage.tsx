import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { type InstancedMesh, Object3D } from 'three'
import { checkupOf } from '../../data/fundCheckup'
import { capitalRun, navChange } from '../../sim/checkup'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { navPayoutLayout, NP_LAYOUT } from '../layout/practice'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const { barW, coinZ, coinR } = NP_LAYOUT
/** 柱子顏色：這檔基金的塔（和組合塔的股票那截同一個藍，看得出是「塔」） */
const BAR_COLOR = ACCENT_COLORS.stock

/**
 * x-pay 每月配息 vs 淨值（真資料）：一排月底淨值柱（起點＋12 個月），每根前面一疊那個月配的金幣，
 * 下面金色＝收益、上面紅色＝本金（配息組成表）。一條虛線標出起點的高度，最後一根柱子比起點矮的那段畫成紅色空框。
 * 柱子從 floor 起畫（標註寫出來），金幣和柱子用同一個「每美元多高」，配了多少和矮了多少可以直接比。
 * 靜態畫面：一種材質一個 InstancedMesh，位置只在資料變時擺一次。
 */
export function NavPayoutStage({ fund }: { fund: string }) {
  const f = checkupOf(fund)
  const L = useMemo(() => navPayoutLayout(f), [f])
  const run = useMemo(() => capitalRun(f), [f])
  const change = useMemo(() => navChange(f), [f])
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const bars = useRef<InstancedMesh>(null)
  const gold = useRef<InstancedMesh>(null)
  const red = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  const reds = useMemo(() => L.coins.filter((c) => c.capitalH > 0), [L])

  useLayoutEffect(() => {
    const place = (m: InstancedMesh | null, items: readonly { x: number; y: number; z: number; w: number; h: number }[]) => {
      if (!m) return
      items.forEach((it, i) => {
        dummy.position.set(...atPlaza(it.x, it.y, it.z))
        dummy.scale.set(it.w, Math.max(0.001, it.h), it.w)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      })
      m.instanceMatrix.needsUpdate = true
    }
    place(bars.current, L.bars.map((b) => ({ x: b.x, y: b.h / 2, z: 0, w: barW, h: b.h })))
    place(gold.current, L.coins.map((c) => ({ x: c.x, y: c.incomeH / 2, z: coinZ, w: 1, h: c.incomeH })))
    place(red.current, reds.map((c) => ({ x: c.x, y: c.incomeH + c.capitalH / 2, z: coinZ, w: 1, h: c.capitalH })))
    invalidate()
  }, [L, reds, dummy, invalidate])

  const first = L.bars[0]!
  const last = L.bars.at(-1)!
  const span = last.x - first.x + barW + 0.8
  const drop = L.startY - L.endY
  // 標註錨在哪一疊金幣：全是收益的第一疊、第一疊有本金的
  const incomeCoin = L.coins[0]!
  // 紅色的標註錨在最後一疊（框往左長；兩個標註一左一右，手機上也不會擠在一起、跑出畫面）
  const capitalCoin = reds.at(-1)
  return (
    <>
      <instancedMesh ref={bars} args={[undefined, undefined, L.bars.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BAR_COLOR} roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={gold} args={[undefined, undefined, L.coins.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[coinR, coinR, 1, 32]} />
        <meshStandardMaterial color={ACCENT_COLORS.coin} metalness={0.6} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={red} args={[undefined, undefined, Math.max(1, reds.length)]} castShadow frustumCulled={false} visible={reds.length > 0}>
        <cylinderGeometry args={[coinR, coinR, 1, 32]} />
        <meshStandardMaterial color={ACCENT_COLORS.loss} metalness={0.3} roughness={0.5} />
      </instancedMesh>
      {/* 起點的高度：橫跨整排的一條虛線 */}
      <mesh position={atPlaza((first.x + last.x) / 2, L.startY, 0)}>
        <boxGeometry args={[span, 0.01, barW + 0.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={line} dashed dashSize={0.3} gapSize={0.2} lineWidth={2} depthTest={false} renderOrder={5} />
      </mesh>
      {/* 最後一根比起點矮的那段：紅色空框 */}
      {drop > 1e-3 && (
        <mesh position={atPlaza(last.x, (L.startY + L.endY) / 2, 0)}>
          <boxGeometry args={[barW, drop, barW]} />
          <meshBasicMaterial color={ACCENT_COLORS.loss} transparent opacity={0.16} depthWrite={false} />
          <Edges color={ACCENT_COLORS.loss} dashed dashSize={0.22} gapSize={0.14} lineWidth={1.5} />
        </mesh>
      )}
      {/* 標註往裡面、往上長（手機畫面窄，往外長的會跑出畫面）；柱子從哪裡起畫寫在第一根的副標 */}
      <Callout anchor={atPlaza(first.x, first.h, 0)} offset={[1.2, 5.2, 0]} title={T.np.start(T.date(first.date))} color={BAR_COLOR} persistent />
      <Callout
        anchor={atPlaza(last.x + barW / 2, (L.startY + L.endY) / 2, 0)}
        offset={[-1.2, 2.4, 0]}
        title={T.np.navAt(T.date(last.date))}
        sub={drop > 1e-3 ? T.np.shorter(Math.abs(change.change).toFixed(2)) : undefined}
        color={ACCENT_COLORS.loss}
        subColor={ACCENT_COLORS.loss}
        persistent
      />
      {run.firstIncomeOnly && run.lastIncomeOnly && (
        <Callout anchor={atPlaza(incomeCoin.x, 0.1, coinZ + coinR)} offset={[0.6, -0.4, 4.2]} title={T.np.income} sub={T.np.incomeSub(run.incomeOnly)} color={ACCENT_COLORS.coin} persistent />
      )}
      {capitalCoin && run.since && (
        <Callout
          anchor={atPlaza(capitalCoin.x, capitalCoin.incomeH + capitalCoin.capitalH, coinZ + coinR)}
          offset={[-0.6, -0.6, 4.2]}
          title={T.np.capital}
          sub={T.np.capitalSub(T.date(run.since), run.min, run.max)}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
    </>
  )
}
