import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Color, type Group, type InstancedMesh, Object3D } from 'three'
import { universe } from '../../data'
import { hedgeExample } from '../../sim/hedge'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { QUAKE, quakeAt, quakeFinal } from '../events/quake'
import type { EventClock } from '../events/types'
import { HEDGE_LAYOUT, hedgeCaseIndex, hedgeDropAt, hedgeTowers } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'

/** 每座塔三截（由下往上）：0050、反向 ETF、現金 */
const PARTS = ['base', 'inverse', 'cash'] as const
const PART_COLORS = [ACCENT_COLORS.stock, ACCENT_COLORS.inverse, ACCENT_COLORS.cash]
const N = 3 * PARTS.length

/**
 * a-hedge 反向來對沖：三座塔（全押 0050、0050＋反向、少買 0050＋現金），起點都是 100 萬（框線）。
 * 拖情境：來回晃的一年（年底大盤回到原處，反向那截每日重設一路磨掉，再扣費用）、大漲那年（反向那截一直賠）、
 * 🌋 大跌那天（scene.eventWhen 打開地震：大盤崩跌，地面震一次、裂出坑；加反向的那座少賠，少買 0050 留現金的那座一樣少賠）。
 * 數字全部來自 sim/hedge（反向的費用是 ✎ 假設）。
 */
export function HedgeStage({ event }: { event: EventClock }) {
  const caseIdx = hedgeCaseIndex(useTour((s) => s.values.hedgeCase))
  const ex = useMemo(() => hedgeExample(universe), [])
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const ref = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [caseIdx, invalidate])
  const quake = event.spec?.kind === 'quake' ? event.spec : undefined
  const dropAt = (t: number | null) => (!quake ? 0 : event.reduced ? 1 : hedgeDropAt(quake, t))
  // 地面裂開之後標註才寫大跌後的數字
  const struck = useEventValue(event, (t) => !!quake && (event.reduced || (t !== null && t >= QUAKE.openAt)))
  const { unit, w: W } = HEDGE_LAYOUT
  const top = 100 * unit

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < N; i++) m.setColorAt(i, new Color(PART_COLORS[i % PARTS.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  // 起點與終點各算一次；每幀只做內插（useFrame 裡不配置物件）
  const from = useMemo(() => hedgeTowers(ex, caseIdx, 0), [ex, caseIdx])
  const to = useMemo(() => hedgeTowers(ex, caseIdx, 1), [ex, caseIdx])
  useFrame(() => {
    // 塔跟著地面震一次（和 s-dd 的柱子一樣）
    const g = group.current
    if (g) {
      const st = quake ? (event.reduced ? quakeFinal(quake) : quakeAt(quake, event.t.current)) : undefined
      g.position.set(st?.shakeX ?? 0, 0, st?.shakeZ ?? 0)
    }
    const m = ref.current
    if (!m) return
    const k = dropAt(event.t.current)
    to.forEach((t, ti) => {
      let y = 0
      PARTS.forEach((p, pi) => {
        const a = from[ti]![p]
        const h = (a + (t[p] - a) * k) * unit
        dummy.position.set(...atPlaza(HEDGE_LAYOUT.x[ti]!, y + h / 2, 0))
        dummy.scale.set(h > 1e-3 ? W : 0.001, Math.max(0.001, h), h > 1e-3 ? W : 0.001)
        dummy.updateMatrix()
        m.setMatrixAt(ti * PARTS.length + pi, dummy.matrix)
        y += h
      })
    })
    m.instanceMatrix.needsUpdate = true
  })

  // 標註寫這個情境走完的結果（🌋 裂開之前寫起點）
  const shown = hedgeTowers(ex, caseIdx, caseIdx === 2 && !struck ? 0 : 1)
  return (
    <>
      <group ref={group}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {HEDGE_LAYOUT.x.map((x) => (
        <mesh key={x} position={atPlaza(x, top / 2, 0)}>
          <boxGeometry args={[W + 0.1, top, W + 0.1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={line} />
        </mesh>
      ))}
      </group>
      {shown.map((t, i) => (
        <Callout
          key={t.id}
          anchor={atPlaza(HEDGE_LAYOUT.x[i]!, 0.1, W / 2)}
          offset={[i === 0 ? -0.6 : i === 2 ? 0.6 : 0, -0.3, i === 1 ? 4.2 : 2.4]}
          title={T.hedge[t.id]}
          sub={T.wan(t.total)}
          color={i === 0 ? ACCENT_COLORS.stock : i === 1 ? ACCENT_COLORS.inverse : ACCENT_COLORS.cash}
          persistent
        />
      ))}
    </>
  )
}
