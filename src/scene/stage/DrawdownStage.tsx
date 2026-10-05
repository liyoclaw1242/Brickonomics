import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { type Group, type InstancedMesh, type Mesh, Object3D } from 'three'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { QUAKE, quakeAt, quakeFinal } from '../events/quake'
import type { EventClock } from '../events/types'
import { DD_DEMO, DD_LAYOUT, ddBarX, ddHeight, ddNow, ddQuake } from '../layout/intermediate'
import { ACCENT_COLORS, SECTOR_COLORS } from '../palette'
import { THEMES } from '../theme'
import { useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'

const N = DD_DEMO.path.length
const BAR_COLOR = SECTOR_COLORS.semiconductor
const pct0 = (r: number) => `${Math.round(r * 100)}%`

/**
 * s-dd 最大跌幅：一排柱子＝每年的價格（時間軸拖到哪，柱子就長到哪）。
 * 現在這根柱子上方的紅色半透明段＝比最高點少掉的部分；一條細線標出到目前的最高點。
 * 拖到谷底時 scene.eventWhen 打開地震（events/Quake）：柱子跟著地面震一次，谷底前面裂出一個坑，坑深＝最大跌幅（和谷底那段紅色一樣深）。
 */
export function DrawdownStage({ event }: { event: EventClock }) {
  const tick = useTour((s) => s.values.tick)
  const now = ddNow(tick)
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const group = useRef<Group>(null)
  const bars = useRef<InstancedMesh>(null)
  const band = useRef<Mesh>(null)
  const peakLine = useRef<Mesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.index, invalidate])
  const quake = event.spec?.kind === 'quake' ? event.spec : undefined
  // 坑裂開之後才寫坑的標註（和面板大數字同時出現）
  const opened = useEventValue(event, (t) => !!quake && t !== null && t >= QUAKE.openAt)

  useFrame(() => {
    const g = group.current
    if (g) {
      const s = quake ? (event.reduced ? quakeFinal(quake) : quakeAt(quake, event.t.current)) : undefined
      g.position.set(s?.shakeX ?? 0, 0, s?.shakeZ ?? 0)
    }
    const m = bars.current
    if (m) {
      for (let i = 0; i < N; i++) {
        const h = ddHeight(DD_DEMO.path[i]!)
        const shown = i <= now.index
        dummy.position.set(...atPlaza(ddBarX(i), h / 2, DD_LAYOUT.barZ))
        dummy.scale.set(shown ? DD_LAYOUT.barW : 0.001, shown ? h : 0.001, shown ? DD_LAYOUT.barW : 0.001)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }
    const b = band.current
    if (b) {
      const lo = ddHeight(now.price)
      const hi = ddHeight(now.peak)
      b.visible = hi - lo > 1e-3
      b.scale.set(DD_LAYOUT.barW + 0.08, Math.max(0.001, hi - lo), DD_LAYOUT.barW + 0.08)
      b.position.set(...atPlaza(ddBarX(now.index), (lo + hi) / 2, DD_LAYOUT.barZ))
    }
    const p = peakLine.current
    if (p) {
      const x0 = ddBarX(now.peakIndex) - DD_LAYOUT.barW / 2
      const x1 = ddBarX(now.index) + DD_LAYOUT.barW / 2
      p.scale.set(Math.max(0.001, x1 - x0), 1, 1)
      p.position.set(...atPlaza((x0 + x1) / 2, ddHeight(now.peak) + 0.04, DD_LAYOUT.barZ))
    }
  })

  const top = ddHeight(now.peak)
  const pit = ddQuake()
  return (
    <>
      <group ref={group}>
        <instancedMesh ref={bars} args={[undefined, undefined, N]} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={BAR_COLOR} roughness={0.8} />
        </instancedMesh>
        <mesh ref={band} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ACCENT_COLORS.loss} transparent opacity={0.4} depthWrite={false} />
          <Edges color={ACCENT_COLORS.loss} />
        </mesh>
        <mesh ref={peakLine}>
          <boxGeometry args={[1, 0.08, 0.08]} />
          <meshBasicMaterial color={line} />
        </mesh>
      </group>
      {/* 最高點：價格寫在線的左端 */}
      <Callout anchor={atPlaza(ddBarX(now.peakIndex), top + 0.1, DD_LAYOUT.barZ)} offset={[-1.6, 1.4, 0]} title={T.dd.peak(now.peak)} persistent />
      {now.drop > 0 && (
        <Callout
          anchor={atPlaza(ddBarX(now.index) + DD_LAYOUT.barW / 2, (ddHeight(now.price) + top) / 2, DD_LAYOUT.barZ)}
          offset={[1.8, 0.6, 0]}
          title={T.dd.drop(pct0(now.drop))}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
      {opened && (
        <Callout anchor={atPlaza(pit.at![0], 0.1, pit.at![1] + 1)} offset={[0, -0.4, 2.6]} title={T.dd.pit(pct0(pit.depth))} color={ACCENT_COLORS.loss} persistent />
      )}
    </>
  )
}
