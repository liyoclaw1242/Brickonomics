import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Color, Curve, type InstancedMesh, type Mesh, Object3D, Quaternion, TubeGeometry, Vector3 } from 'three'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { strikeAt } from '../events/lightning'
import type { EventClock } from '../events/types'
import { CORR_LAYOUT, corrBlocks, corrDropAt, corrNow } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import type { Quality } from '../quality'
import { THEMES } from '../theme'
import { useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'

const { w: W, height: H, pairs } = CORR_LAYOUT
/** 方塊顏色：A（被打中的那家）、一起動的夥伴、一上一下的夥伴 */
const COLORS = [ACCENT_COLORS.stock, ACCENT_COLORS.together, ACCENT_COLORS.stock, ACCENT_COLORS.opposite]
/** 彈簧：繞幾圈、半徑、線粗；沿 x 軸長 1 的螺旋，再拉長、轉到兩顆方塊之間（拉長＝彈簧被拉開） */
const TURNS = 6
const COIL_R = 0.45
const WIRE = 0.07
const SEGMENTS = { high: 160, low: 72 } as const
const GAIN = '#43a047'

class Helix extends Curve<Vector3> {
  constructor() {
    super()
  }
  getPoint(s: number, out = new Vector3()): Vector3 {
    const a = s * TURNS * Math.PI * 2
    return out.set(s, Math.cos(a) * COIL_R, Math.sin(a) * COIL_R)
  }
}
const X_AXIS = new Vector3(1, 0, 0)

/**
 * a-corr 一起跌或抵消：兩組方塊，每組兩顆用彈簧連著。左組「一起動」（A＋紫）、右組「一上一下」（A＋綠）。
 * 鏡頭停下後 ⚡（scene.event lightning，targets＝兩顆 A 的頂面）打中 A：A 跌 8%，一起動的夥伴也跌 4%，一上一下的夥伴漲 8%。
 * 細線＝原本的高度；紅色＝少掉的、綠色＝多出來的；彈簧跟著兩顆的頂端走（一起動的平平往下，一上一下的斜過去）。
 */
export function CorrelationStage({ event, quality }: { event: EventClock; quality: Quality }) {
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const blocks = useRef<InstancedMesh>(null)
  const bands = useRef<InstancedMesh>(null)
  const springs = [useRef<Mesh>(null), useRef<Mesh>(null)]
  const dummy = useMemo(() => new Object3D(), [])
  const v = useMemo(() => ({ a: new Vector3(), b: new Vector3(), d: new Vector3(), q: new Quaternion() }), [])
  const tube = useMemo(() => new TubeGeometry(new Helix(), SEGMENTS[quality], WIRE, 6, false), [quality])
  useEffect(() => () => tube.dispose(), [tube])
  const n = corrNow()
  const struck = useEventValue(event, (t) => event.reduced || strikeAt(event.spec, t))
  const dropAt = (t: number | null) => (event.spec?.kind !== 'lightning' ? 0 : event.reduced ? 1 : corrDropAt(t))

  useLayoutEffect(() => {
    const m = blocks.current
    if (m) {
      COLORS.forEach((c, i) => m.setColorAt(i, new Color(c)))
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [])

  useFrame(() => {
    const now = corrBlocks(dropAt(event.t.current))
    const m = blocks.current
    const bd = bands.current
    now.forEach((b, i) => {
      if (m) {
        dummy.position.set(...atPlaza(b.x, b.h / 2, 0))
        dummy.scale.set(W, b.h, W)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      }
      if (bd) {
        const lo = Math.min(b.h, H)
        const hi = Math.max(b.h, H)
        dummy.position.set(...atPlaza(b.x, (lo + hi) / 2, 0))
        dummy.scale.set(W + 0.12, Math.max(0.001, hi - lo), W + 0.12)
        dummy.updateMatrix()
        bd.setMatrixAt(i, dummy.matrix)
        bd.setColorAt(i, b.h < H ? RED : GREEN)
      }
    })
    if (m) m.instanceMatrix.needsUpdate = true
    if (bd) {
      bd.instanceMatrix.needsUpdate = true
      if (bd.instanceColor) bd.instanceColor.needsUpdate = true
    }
    // 彈簧：從 A 的右上角到夥伴的左上角（一起動的平平往下；一上一下的斜過去）
    springs.forEach((r, k) => {
      const sp = r.current
      if (!sp) return
      const A = now[k * 2]!
      const B = now[k * 2 + 1]!
      v.a.set(...atPlaza(A.x + W / 2, A.h - 0.7, 0))
      v.b.set(...atPlaza(B.x - W / 2, B.h - 0.7, 0))
      v.d.subVectors(v.b, v.a)
      const len = v.d.length()
      v.q.setFromUnitVectors(X_AXIS, v.d.normalize())
      sp.position.copy(v.a)
      sp.quaternion.copy(v.q)
      sp.scale.set(len, 1, 1)
    })
  })

  const end = corrBlocks(1)
  return (
    <>
      <instancedMesh ref={blocks} args={[undefined, undefined, 4]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[undefined, undefined, 4]} frustumCulled={false} visible={struck}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      {/* 原本的高度：只畫一圈框線 */}
      {corrBlocks(0).map((b) => (
        <mesh key={b.id} position={atPlaza(b.x, H, 0)}>
          <boxGeometry args={[W + 0.2, 0.02, W + 0.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={line} />
        </mesh>
      ))}
      {springs.map((r, k) => (
        <mesh key={k} ref={r} geometry={tube} castShadow>
          <meshStandardMaterial color={line} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
      {/* 每組在地上寫是哪一種；打中之後寫各一半合起來 */}
      <Callout
        anchor={atPlaza(pairs.together, 0.1, W / 2)}
        offset={[0, -0.3, 2.6]}
        title={T.corr.together}
        sub={struck ? T.corr.mix(move0(n.mixTogether)) : undefined}
        color={ACCENT_COLORS.together}
        persistent
      />
      <Callout
        anchor={atPlaza(pairs.opposite, 0.1, W / 2)}
        offset={[0, -0.3, 2.6]}
        title={T.corr.opposite}
        sub={struck ? T.corr.mix(n.mixOpposite === 0 ? '0%' : move0(n.mixOpposite)) : undefined}
        color={ACCENT_COLORS.opposite}
        persistent
      />
      {/* 每顆頭上寫 A／B；打中之後寫各自漲跌多少 */}
      {end.map((b, i) => (
        <Callout
          key={b.id}
          anchor={atPlaza(b.x, Math.max(b.h, H) + 0.1, 0)}
          offset={i % 2 === 0 ? [-1.2, 1.4, 0] : i === 3 ? [-0.4, 3, 0] : [1.2, 2.8, 0]}
          title={i % 2 === 0 ? T.corr.a(struck ? move0(b.move) : '') : (i === 1 ? T.corr.bTogether : T.corr.bOpposite)(struck ? move0(b.move) : '')}
          compact
          persistent
        />
      ))}
    </>
  )
}

/** 方塊頭上的漲跌：整數 %（標註要短，手機上四個擠在一起） */
const move0 = (x: number) => `${x < 0 ? T.move.down : T.move.up} ${Math.round(Math.abs(x) * 100)}%`

const RED = new Color(ACCENT_COLORS.loss)
const GREEN = new Color(GAIN)
