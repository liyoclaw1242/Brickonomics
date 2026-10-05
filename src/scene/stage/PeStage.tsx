import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { BUBBLE, bubbleAt, bubbleFinal, bubbleRadii, liftOf } from '../events/bubble'
import { useEventValue } from '../useEventClock'
import type { EventClock } from '../events/types'
import { PE_DEMO, PE_LAYOUT, peSlabs, peYears, type PeKey } from '../layout/intermediate'
import { ACCENT_COLORS, SECTOR_COLORS } from '../palette'
import { atPlaza } from './plaza'

const KEYS: readonly PeKey[] = ['cheap', 'pricey']
const BUILDING = SECTOR_COLORS.finance
/** 每年賺的錢（公司的獲利，不一定發給你，所以不用金幣）：淺綠色的薄片 */
const PROFIT = ACCENT_COLORS.profit
const SLAB_FILL = 0.8
const MAX_SLABS = KEYS.reduce((n, k) => n + peYears(k), 0)

/**
 * s-pe 本益比：兩棟股價一樣高的大樓；旁邊一疊淺綠薄片＝公司每年每股賺的錢，一年一片，疊到和大樓一樣高＝賺回股價。
 * 拖經過年數：左邊 15 年就疊滿；右邊要 60 年。數滿 60 年時 scene.eventWhen 打開泡泡（events/Bubble，float）：
 * 右邊那棟（太貴）被泡泡包住浮起來。這一步不讓泡泡破（本益比高不代表一定會跌）。
 */
export function PeStage({ event }: { event: EventClock }) {
  const periods = useTour((s) => s.values.periods)
  const counts = { cheap: peSlabs('cheap', periods).count, pricey: peSlabs('pricey', periods).count }
  const towers = useRef<InstancedMesh>(null)
  const slabs = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [counts.cheap, counts.pricey, invalidate])
  const bubble = event.spec?.kind === 'bubble' ? event.spec : undefined
  // 泡泡開始浮起才標出它的意思（mid-r1：透明泡泡是什麼沒標）
  const floating = useEventValue(event, (t) => !!bubble && t !== null && t >= BUBBLE.liftAt)

  useLayoutEffect(() => {
    const m = towers.current
    if (!m) return
    const c = new Color(BUILDING)
    KEYS.forEach((_, i) => m.setColorAt(i, c))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  useFrame(() => {
    const s = bubble ? (event.reduced ? bubbleFinal(bubble) : bubbleAt(bubble, event.t.current)) : undefined
    const m = towers.current
    if (m) {
      KEYS.forEach((k, i) => {
        const lift = k === 'pricey' && s ? s.lift : 0
        const sy = k === 'pricey' && s ? s.squash : 1
        dummy.position.set(...atPlaza(PE_LAYOUT.x[k], lift + (PE_LAYOUT.height * sy) / 2, 0))
        dummy.scale.set(PE_LAYOUT.size, PE_LAYOUT.height * sy, PE_LAYOUT.size)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      })
      m.instanceMatrix.needsUpdate = true
    }
    const sl = slabs.current
    if (sl) {
      let j = 0
      for (const k of KEYS) {
        const { count, pitch } = peSlabs(k, periods)
        for (let y = 0; y < peYears(k); y++) {
          const on = y < count
          dummy.position.set(...atPlaza(PE_LAYOUT.slabX[k], (y + 0.5) * pitch, 0))
          dummy.scale.set(on ? PE_LAYOUT.slabW : 0.001, on ? pitch * SLAB_FILL : 0.001, on ? PE_LAYOUT.slabW : 0.001)
          dummy.updateMatrix()
          sl.setMatrixAt(j++, dummy.matrix)
        }
      }
      sl.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={towers} args={[undefined, undefined, KEYS.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={slabs} args={[undefined, undefined, MAX_SLABS]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={PROFIT} roughness={0.6} />
      </instancedMesh>
      {floating && bubble && (
        <Callout
          anchor={atPlaza(PE_LAYOUT.x.pricey, liftOf(bubble) + PE_LAYOUT.height / 2 + bubbleRadii(bubble.target.size)[1], 0)}
          offset={[0, 1.2, 0]}
          title={T.pe.bubble}
          sub={T.pe.bubbleSub}
          persistent
        />
      )}
      {KEYS.map((k) => (
        <Callout
          key={k}
          // 錨在自己那一組（大樓＋那一疊）的中間前面，字塊往外長（左組往左、右組往右）：兩組中間留空，不會互相蓋住
          anchor={atPlaza((PE_LAYOUT.x[k] + PE_LAYOUT.slabX[k]) / 2, 0.1, PE_LAYOUT.size / 2)}
          offset={[k === 'cheap' ? -1.2 : 1.2, -0.3, 2.6]}
          title={T.pe.years(counts[k])}
          sub={T.pe.sub(PE_DEMO.price, PE_DEMO.earnings[k])}
          color={PROFIT}
          persistent
        />
      ))}
    </>
  )
}
