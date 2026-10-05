import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Color, type InstancedMesh, type Mesh, Object3D } from 'three'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { DAY_TRADE } from '../../sim/dayTrade'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { DT_LAYOUT, dtNow, dtTower } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const { towerX, pileX, w: W, height: H, chipsZ, chips: N, chipR, chipGap } = DT_LAYOUT
const GREEN = new Color('#43a047')
const RED = new Color(ACCENT_COLORS.loss)
const pct = (r: number) => `${Number((r * 100).toFixed(2))}%`

/**
 * a-dt 當沖的成本：左邊一座塔＝本金（框線＝原本 100 萬），右邊一堆紅色＝一路付掉的交易成本，兩個加起來永遠是 100 萬：
 * 勝率 50% 時賺、賠互相抵銷（前面一排小圓片，綠＝賺的比例），少掉的全部付給了交易成本。拖進出次數，塔一路變矮、紅色那堆一路變高；
 * 折數、勝率拉桿即時改成本與結果（標註寫打平要多少勝率）。
 */
export function DayTradeStage() {
  const trades = useTour((s) => s.values.trades)
  const discount = useTour((s) => s.values.feeDiscount)
  const winRate = useTour((s) => s.values.winRate)
  const now = dtNow(trades, discount, winRate)
  const h = dtTower(trades, discount, winRate)
  const wins = Math.round(now.winRate * N)
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const tower = useRef<Mesh>(null)
  const pile = useRef<Mesh>(null)
  const chips = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.n, now.discount, now.winRate, invalidate])

  useLayoutEffect(() => {
    const m = chips.current
    if (!m) return
    const x0 = -((N - 1) * chipGap) / 2
    for (let i = 0; i < N; i++) {
      dummy.position.set(...atPlaza(x0 + i * chipGap, 0.12, chipsZ))
      dummy.scale.set(chipR, 0.24, chipR)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, i < wins ? GREEN : RED)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [dummy, wins, invalidate])

  useFrame(() => {
    const t = tower.current
    if (t) {
      t.scale.set(W, Math.max(0.001, h.capital), W)
      t.position.set(...atPlaza(towerX, h.capital / 2, 0))
    }
    const p = pile.current
    if (p) {
      p.visible = h.cost > 1e-3
      p.scale.set(W, Math.max(0.001, h.cost), W)
      p.position.set(...atPlaza(pileX, h.cost / 2, 0))
    }
  })

  return (
    <>
      <mesh position={atPlaza(towerX, H / 2, 0)}>
        <boxGeometry args={[W + 0.1, H, W + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={line} />
      </mesh>
      <mesh ref={tower} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.stock} roughness={0.75} />
      </mesh>
      <mesh ref={pile} castShadow receiveShadow visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.loss} roughness={0.8} />
      </mesh>
      <instancedMesh ref={chips} args={[undefined, undefined, N]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 20]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <Callout anchor={atPlaza(towerX, H, 0)} offset={[0, 1.4, 0]} title={T.dt.ghost} persistent />
      <Callout
        anchor={atPlaza(towerX - W / 2, 0.1, W / 2)}
        offset={[-0.4, -0.3, 2.2]}
        title={T.dt.capital(now.n)}
        sub={T.dt.left(T.wan(now.capital))}
        color={ACCENT_COLORS.stock}
        persistent
      />
      {now.n > 0 && (
        <Callout
          anchor={atPlaza(pileX, h.cost, 0)}
          offset={[0, 1.6, 0]}
          title={T.dt.cost}
          sub={T.wan(now.costPaid)}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
      <Callout
        anchor={atPlaza(2, 0.2, chipsZ + chipR)}
        offset={[0, -0.3, 2.6]}
        title={T.dt.chips(pct(now.winRate))}
        sub={T.dt.chipsSub(pct(DAY_TRADE.avgWin), pct(DAY_TRADE.avgLoss), pct(now.breakEven))}
        persistent
      />
    </>
  )
}
