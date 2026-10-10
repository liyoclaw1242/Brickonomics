import { type ComponentType, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type InstancedMesh, Object3D } from 'three'
import { ACCENT_COLORS, SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from '../stage/plaza'
import { PREVIEW_LAYOUT } from './preview'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { bubbleAt, bubbleFinal } from './bubble'
import { freezeTint, frostMix } from './freeze'
import { coinScaleAt } from './heatwave'
import { TreeCrown } from './SunnyTree.tsx'
import { treeGrowAt } from './sunnyTree'
import { quakeAt } from './quake'
import { heightOnPath, waveCount, waveStepAt } from './wave'
import { LEVERAGE, leverageTowers } from '../../sim/leverage'
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

/** 寒流：三塊長短不同的板子（借據），顏色跟著霜往冰藍混 */
function FreezeProps({ spec, clock }: PreviewPropsOf<'freeze'>) {
  const ice = THEMES[useThemeStore((s) => s.theme)].frost.ice
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const colors = useMemo(() => ({ base: new Color('#c9a227'), ice: new Color(), c: new Color() }), [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    spec.targets.forEach((b, i) => {
      dummy.position.set(...atPlaza(b.at[0], b.at[1] + b.size[1] / 2, b.at[2]))
      dummy.scale.set(...b.size)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [spec.targets, dummy])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    colors.ice.set(ice)
    const t = clock.reduced ? Infinity : clock.t.current
    const { base, ice: ic, c } = colors
    for (let i = 0; i < spec.targets.length; i++) {
      // 先褪色變亮再往冰藍混（直接線性混，金色會變橄欖綠）
      const [r, g, b] = frostMix([base.r, base.g, base.b], [ic.r, ic.g, ic.b], freezeTint(spec, i, t))
      m.setColorAt(i, c.setRGB(r, g, b))
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spec.targets.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} metalness={0.2} />
    </instancedMesh>
  )
}

/** 晴天＋大樹：一座塔跟著 treeGrowAt 長高、塔頂的樹冠一起長；左邊幾小堆（像每個月買的一小份）當對照 */
function SunnyTreeProps({ clock, quality }: PreviewPropsOf<'sunnyTree'>) {
  const { tree, treePiles } = PREVIEW_LAYOUT
  const ref = useRef<InstancedMesh>(null)
  const crown = useRef<Group>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const grow = useCallback(() => treeGrowAt(clock.reduced ? Infinity : clock.t.current), [clock])
  const n = treePiles.length + 1
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const c = new Color(SECTOR_COLORS.semiconductor)
    for (let i = 0; i < n; i++) m.setColorAt(i, c)
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [n])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    treePiles.forEach((h, i) => {
      dummy.position.set(...atPlaza(-12 + i * 2.2, h / 2, 2))
      dummy.scale.set(1.4, h, 1.4)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    const h = tree.from + (tree.to - tree.from) * grow()
    dummy.position.set(...atPlaza(tree.at[0], h / 2, tree.at[2]))
    dummy.scale.set(tree.width, h, tree.width)
    dummy.updateMatrix()
    m.setMatrixAt(treePiles.length, dummy.matrix)
    m.instanceMatrix.needsUpdate = true
    crown.current?.position.set(...atPlaza(tree.at[0], h - 0.4, tree.at[2]))
  })
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <group ref={crown}>
        <TreeCrown radius={2.4} grow={grow} quality={quality} />
      </group>
    </>
  )
}

const COINS_PER_STACK = 4
const COIN_H = 0.32

/** 熱浪：三疊金幣，跟著 coinScaleAt 一起縮小（底部貼地） */
function HeatwaveProps({ spec, clock }: PreviewPropsOf<'heatwave'>) {
  const coins = spec.coins ?? []
  const r = spec.coinRadius ?? 1
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const n = coins.length * COINS_PER_STACK
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const k = Math.max(0.001, coinScaleAt(spec, clock.reduced ? Infinity : clock.t.current))
    coins.forEach((c, i) => {
      for (let j = 0; j < COINS_PER_STACK; j++) {
        dummy.position.set(...atPlaza(c[0], c[1] + (j + 0.5) * COIN_H * k, c[2]))
        dummy.rotation.set(0, j * 0.4, 0)
        dummy.scale.set(r * k, k, r * k)
        dummy.updateMatrix()
        m.setMatrixAt(i * COINS_PER_STACK + j, dummy.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow receiveShadow frustumCulled={false}>
      <cylinderGeometry args={[1, 1, COIN_H * 0.9, 20]} />
      <meshStandardMaterial color={ACCENT_COLORS.coin} metalness={0.5} roughness={0.35} emissive={ACCENT_COLORS.coin} emissiveIntensity={0.1} />
    </instancedMesh>
  )
}

/** 塔高：路徑上的 100 對應幾個世界單位 */
const WAVE_UNIT = 0.06

/**
 * 大浪：三座塔（一般、2 倍、反向），像舞台一樣沿 leveragedPath 取高度（−10%／+10% 來回、次數＝浪的次數）：
 * 每次浪頭打到跌一步（2 倍塔被打矮一截）、退下漲一步（waveStepAt）；2 倍塔每道浪後都更矮。
 */
function WaveProps({ spec, clock }: PreviewPropsOf<'wave'>) {
  const boxes = spec.targets ?? []
  const paths = useMemo(() => {
    const t = leverageTowers({ ...LEVERAGE, rounds: waveCount(spec) })
    return [t.plain, t.double, t.inverse].map((p) => p.map((v) => v * WAVE_UNIT))
  }, [spec])
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const colors = [SECTOR_COLORS.semiconductor, SECTOR_COLORS.internet, SECTOR_COLORS.electronics]
    boxes.forEach((_, i) => m.setColorAt(i, new Color(colors[i % colors.length])))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [boxes])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const step = waveStepAt(spec, clock.reduced ? Infinity : clock.t.current)
    boxes.forEach((b, i) => {
      const h = heightOnPath(paths[i % paths.length]!, step)
      dummy.position.set(...atPlaza(b.at[0], b.at[1] + h / 2, b.at[2]))
      dummy.scale.set(b.size[0], h, b.size[2])
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, boxes.length)]} castShadow receiveShadow frustumCulled={false}>
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
  freeze: FreezeProps,
  sunnyTree: SunnyTreeProps,
  heatwave: HeatwaveProps,
  wave: WaveProps,
}
