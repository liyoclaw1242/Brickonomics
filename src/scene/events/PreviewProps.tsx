import { type ComponentType, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from '../stage/plaza'
import { PREVIEW_LAYOUT } from './preview'
import { bubbleAt, bubbleFinal } from './bubble'
import { quakeAt } from './quake'
import type { EventClock, EventKind, SpecOf } from './types'

/**
 * DEV 事件預覽頁的假方塊（中性的小舞台）：每種事件一個（或 null＝只畫事件本身）。
 * 舞台怎麼讀事件時鐘（例如地面震動、泡泡浮起多高、金幣縮成多少），這裡就照同樣的方式示範一次。
 */
export type PreviewPropsOf<K extends EventKind> = { spec: SpecOf<K>; clock: EventClock; quality: Quality }

const BAR = 1.6
const BAR_GAP = 3

/** 地震：坑後面一排柱子（像價格時間線），跟著地面一起震 */
function QuakeProps({ spec, clock }: PreviewPropsOf<'quake'>) {
  const bars = PREVIEW_LAYOUT.quakeBars
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const x0 = -((bars.length - 1) * BAR_GAP) / 2
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const c = new Color(SECTOR_COLORS.semiconductor)
    bars.forEach((_, i) => m.setColorAt(i, c))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [bars])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const s = quakeAt(spec, clock.reduced ? Infinity : clock.t.current)
    bars.forEach((h, i) => {
      dummy.position.set(...atPlaza(x0 + i * BAR_GAP + s.shakeX, h / 2, -3 + s.shakeZ))
      dummy.scale.set(BAR, h, BAR)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bars.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}

/** 泡泡：兩棟一樣大的樓；右邊那棟（目標）跟著泡泡浮起、落回 */
function BubbleProps({ spec, clock }: PreviewPropsOf<'bubble'>) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const boxes = [PREVIEW_LAYOUT.bubbleOther, spec.target]
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    m.setColorAt(0, new Color(SECTOR_COLORS.electronics))
    m.setColorAt(1, new Color(SECTOR_COLORS.internet))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const s = clock.reduced ? bubbleFinal(spec) : bubbleAt(spec, clock.t.current)
    boxes.forEach((b, i) => {
      const lift = i === 1 ? s.lift : 0
      const sy = i === 1 ? s.squash : 1
      dummy.position.set(...atPlaza(b.at[0], b.at[1] + lift + (b.size[1] * sy) / 2, b.at[2]))
      dummy.scale.set(b.size[0], b.size[1] * sy, b.size[2])
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 2]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}

export const PREVIEW_PROPS: { [K in EventKind]: ComponentType<PreviewPropsOf<K>> | null } = {
  tornado: null,
  lightning: null,
  quake: QuakeProps,
  bubble: BubbleProps,
}
