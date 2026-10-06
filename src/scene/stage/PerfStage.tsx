import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { type Group, type InstancedMesh, Object3D } from 'three'
import { checkupOf } from '../../data/fundCheckup'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { quakeAt, quakeFinal } from '../events/quake'
import type { EventClock } from '../events/types'
import { PERF_LAYOUT, perfLayout } from '../layout/practice'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const { barW, zeroY } = PERF_LAYOUT
const FUND = ACCENT_COLORS.active
const BENCH = ACCENT_COLORS.passive
/** −11.93 → '−11.9%'；8.35 → '+8.4%'（負號 U+2212） */
const signed1 = (v: number) => (v > 0 ? `+${v.toFixed(1)}%` : v < 0 ? `−${(-v).toFixed(1)}%` : '0%')

/**
 * x-perf 歷年績效（真資料）：每年兩座塔，左＝這檔基金、右＝它自己選的指標（藍圖）；從零線往上是漲、往下是跌。
 * 最差那年下面 🌋（步驟的 scene.event quake，坑在那一對柱子前面），柱子跟著地面震一次。
 */
export function PerfStage({ fund, event }: { fund: string; event: EventClock }) {
  const f = checkupOf(fund)
  const L = useMemo(() => perfLayout(f), [f])
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const fundBars = useRef<InstancedMesh>(null)
  const benchBars = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  const quake = event.spec?.kind === 'quake' ? event.spec : undefined

  useLayoutEffect(() => {
    const place = (m: InstancedMesh | null, which: 'fund' | 'bench') => {
      if (!m) return
      L.years.forEach((y, i) => {
        const b = y[which]
        dummy.position.set(...atPlaza(b.x, b.y, 0))
        dummy.scale.set(barW, Math.max(0.001, b.h), barW)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      })
      m.instanceMatrix.needsUpdate = true
    }
    place(fundBars.current, 'fund')
    place(benchBars.current, 'bench')
    invalidate()
  }, [L, dummy, invalidate])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const s = quake ? (event.reduced ? quakeFinal(quake) : quakeAt(quake, event.t.current)) : undefined
    g.position.set(s?.shakeX ?? 0, 0, s?.shakeZ ?? 0)
  })

  const first = L.years[0]!
  const legend = L.years.find((y) => y.fund.pct >= 0 && y.bench.pct >= 0) ?? L.years.at(-1)!
  return (
    <>
      <group ref={group}>
        <instancedMesh ref={fundBars} args={[undefined, undefined, L.years.length]} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={FUND} roughness={0.7} />
        </instancedMesh>
        <instancedMesh ref={benchBars} args={[undefined, undefined, L.years.length]} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={BENCH} roughness={0.7} />
        </instancedMesh>
        {/* 零線：漲的往上、跌的往下 */}
        <mesh position={atPlaza(0, zeroY, 0)}>
          <boxGeometry args={[L.span + 1.5, 0.05, barW + 0.8]} />
          <meshBasicMaterial color={line} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      <Callout anchor={atPlaza(first.fund.x - barW / 2 - 0.6, zeroY, 0)} offset={[-1.2, 0, 0]} title={T.checkup.zero} persistent />
      {/* 年份標註一高一低交錯（手機畫面窄，並排會疊在一起） */}
      {L.years.map((y, i) => (
        <Callout
          key={y.year}
          anchor={atPlaza(y.x, 0.1, barW / 2 + 0.2)}
          offset={i % 2 === 0 ? [0, -0.4, 1.8] : [0, -0.4, 8.6]}
          title={T.checkup.year(y.year, y.down)}
          sub={T.checkup.yearSub(signed1(y.fund.pct), signed1(y.bench.pct))}
          color={y.down ? ACCENT_COLORS.loss : undefined}
          persistent
        />
      ))}
      {/* 圖例錨在第一個漲的年份（柱子在零線上面，標註往上長，不會跑出手機畫面） */}
      <Callout anchor={atPlaza(legend.fund.x, legend.fund.y + legend.fund.h / 2, 0)} offset={[-1.8, 3.0, 0]} title={T.checkup.fund} color={FUND} persistent />
      <Callout anchor={atPlaza(legend.bench.x, legend.bench.y + legend.bench.h / 2, 0)} offset={[1.4, 2.2, 0]} title={T.checkup.bench} color={BENCH} persistent />
    </>
  )
}
