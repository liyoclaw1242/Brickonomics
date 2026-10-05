import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import type { Mesh } from 'three'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import type { EventClock } from '../events/types'
import { PORT_LAYOUT, portDamageAt, portNow, portTower } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'

const { x: X, w: W, height: H } = PORT_LAYOUT
const pct0 = (v: number) => `${Math.round(v)}%`

/**
 * a-port 自己蓋組合塔：一座塔，下面一截股票（藍）、上面一截債券（銀），合起來＝100 萬（虛線框＝原本的高度）。
 * 拖債券比例：兩截的比例跟著變。龍捲風（scene.event tornado，鏡頭停下就來）掃到塔時，股票那截縮掉 40%、債券那截長 5%
 * （sim/portfolio 的示意風暴），塔頂往下掉，虛線框和塔頂之間的空隙＝少掉的那一截。風暴過後再拖，塔直接畫風暴後的樣子。
 */
export function PortfolioStage({ event }: { event: EventClock }) {
  const bondPct = useTour((s) => s.values.bondPct)
  const now = portNow(bondPct)
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const stock = useRef<Mesh>(null)
  const bond = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.bondPct, invalidate])
  const tornado = event.spec?.kind === 'tornado'
  const damageAt = (t: number | null) => (!tornado ? 0 : event.reduced ? 1 : portDamageAt(t))
  // 塔被掃完了才寫風暴後的數字（標註不跟著每一幀變）
  const hit = useEventValue(event, (t) => damageAt(t) >= 1)

  useFrame(() => {
    const tw = portTower(now.bondPct, damageAt(event.t.current))
    const s = stock.current
    if (s) {
      s.visible = tw.stock > 1e-3
      s.scale.set(W, Math.max(0.001, tw.stock), W)
      s.position.set(...atPlaza(X, tw.stock / 2, 0))
    }
    const b = bond.current
    if (b) {
      b.visible = tw.bond > 1e-3
      b.scale.set(W, Math.max(0.001, tw.bond), W)
      b.position.set(...atPlaza(X, tw.stock + tw.bond / 2, 0))
    }
  })

  const after = portTower(now.bondPct, 1)
  const shown = hit ? after : portTower(now.bondPct, 0)
  return (
    <>
      {/* 原本 100 萬的高度：只畫框線 */}
      <mesh position={atPlaza(X, H / 2, 0)}>
        <boxGeometry args={[W + 0.1, H, W + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={line} />
      </mesh>
      <mesh ref={stock} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.stock} roughness={0.75} />
      </mesh>
      <mesh ref={bond} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.bond} roughness={0.5} metalness={0.1} />
      </mesh>
      <Callout anchor={atPlaza(X - W / 2, H, 0)} offset={[-2.2, 0.8, 0]} title={T.port.ghost} persistent />
      {now.stockPct > 0 && (
        <Callout
          anchor={atPlaza(X - W / 2, shown.stock / 2, 0)}
          offset={[-3, 0, 0]}
          title={T.port.stock(now.stockPct)}
          sub={hit ? T.port.after(T.wan(now.after.stock)) : undefined}
          color={ACCENT_COLORS.stock}
          persistent
        />
      )}
      {now.bondPct > 0 && (
        <Callout
          anchor={atPlaza(X + W / 2, shown.stock + shown.bond / 2, 0)}
          offset={[3, 0, 0]}
          title={T.port.bond(now.bondPct)}
          sub={hit ? T.port.after(T.wan(now.after.bond)) : undefined}
          color={ACCENT_COLORS.bond}
          persistent
        />
      )}
      {hit && (
        <Callout
          anchor={atPlaza(X + W / 2, (after.top + H) / 2, 0)}
          offset={[3, 1.2, 0]}
          title={T.port.lost(pct0(now.after.lossPct))}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
    </>
  )
}
