import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { ACCENT_COLORS, type BlockLook, type MaterialKind } from './palette'
import { BlockMaterial } from './materials'
import type { Quality } from './quality'
import { useLongPress } from './useLongPress'
import { useContinuousRender } from './useContinuousRender'
import { useThemeStore } from '../store/theme'
import { useTour } from '../store/tour'
import { THEMES } from './theme'
import { groupTone, toneColor, toneProgress, TONE_FADE_SEC } from './layout/tone'
import { approach, explodeOffsetY, MAX_FRAME_DT, isHidden, voxelPosition, VOXEL_SCALE, type CutSpec, type Voxel } from './layout/voxels'

type Props = {
  voxels: Voxel[]
  looks: BlockLook[]
  w: number
  d: number
  explode: number
  cut: CutSpec | null
  /** 鮮豔的群組（導覽焦點） */
  focusGroups?: number[]
  /** 被選取的群組：優先於焦點 */
  picked: number | null
  quality: Quality
  damaged?: ReadonlySet<Voxel>
  onPick?: (group: number) => void
}

/** 導覽模式等鏡頭停穩才開始漸變；超過這個秒數就不等 */
const SETTLE_TIMEOUT_SEC = 1.5
const NO_FOCUS: number[] = []
const DAMAGE_COLOR = new Color(ACCENT_COLORS.loss)
const DAMAGE_MIX = 0.9

/** 依材質分組：一種材質一個 InstancedMesh */
export function VoxelInstances(props: Props) {
  const { voxels, looks } = props
  const byKind = useMemo(() => {
    const m = new Map<MaterialKind, Voxel[]>()
    for (const v of voxels) {
      const kind = looks[v.group]!.kind
      const list = m.get(kind)
      if (list) list.push(v)
      else m.set(kind, [v])
    }
    return [...m]
  }, [voxels, looks])
  return (
    <>
      {byKind.map(([kind, vs]) => (
        <KindMesh key={`${kind}-${vs.length}`} {...props} kind={kind} voxels={vs} />
      ))}
    </>
  )
}

function KindMesh({ kind, voxels, looks, w, d, explode, cut, focusGroups = NO_FOCUS, picked, quality, damaged, onPick }: Props & { kind: MaterialKind }) {
  const ref = useRef<InstancedMesh>(null)
  const anim = useRef({ explode, dirty: true })
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)

  const theme = useThemeStore((s) => s.theme)
  const exploded = explode > 0.3
  const explodeRef = useRef(explode)
  explodeRef.current = explode
  const focusKey = focusGroups.join(',')
  const [fading, setFading] = useState(false)
  // cur：目前顯示的顏色；fade：進行中的漸變
  const tone = useRef<{
    cur: Color[]
    voxels: Voxel[] | null
    looks: BlockLook[] | null
    theme: string
    fade: { from: Color[]; to: Color[]; elapsed: number; wait: number; started: boolean } | null
  }>({ cur: [], voxels: null, looks: null, theme, fade: null })

  useContinuousRender(fading)

  // 只在「色調目標」改變時重算（explode 只看是否越過 0.3，不是每幀）
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const t = tone.current
    const th = THEMES[theme]
    const focus = focusKey === '' ? NO_FOCUS : focusKey.split(',').map(Number)
    const to = voxels.map((v) => {
      const c = new Color(toneColor(looks[v.group]!.color, groupTone({ group: v.group, focus, picked, explode: explodeRef.current }), th))
      if (damaged?.has(v)) c.lerp(DAMAGE_COLOR, DAMAGE_MIX)
      return c
    })
    const sameSet = t.voxels === voxels && t.looks === looks && t.theme === theme && t.cur.length === to.length
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const apply = (cols: Color[]) => {
      cols.forEach((c, i) => mesh.setColorAt(i, c))
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    t.voxels = voxels
    t.looks = looks
    t.theme = theme
    if (!sameSet || reduced) {
      t.fade = null
      t.cur = to
      apply(to)
      setFading(false)
    } else {
      t.fade = { from: t.cur.map((c) => c.clone()), to, elapsed: 0, wait: 0, started: false }
      setFading(true)
    }
    invalidate()
  }, [voxels, looks, theme, focusKey, picked, exploded, damaged, invalidate])

  useLayoutEffect(() => {
    anim.current.dirty = true
    invalidate()
  }, [voxels, cut, w, d, invalidate])

  // explode 是普通 prop（非 three 物件屬性），變動不會自動觸發重繪
  useLayoutEffect(() => {
    invalidate()
  }, [explode, invalidate])

  const lerped = useMemo(() => new Color(), [])
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const f = tone.current.fade
    if (f) {
      if (!f.started) {
        // 3b1b：一次只變一件事。導覽模式等鏡頭停穩（沙盒直接開始；最多等 1.5 秒）
        f.wait += dt
        const settled = useTour.getState().mode === 'sandbox' || document.body.dataset.cameraSettled === 'true'
        if (settled || f.wait >= SETTLE_TIMEOUT_SEC) f.started = true
      } else {
        f.elapsed += Math.min(dt, MAX_FRAME_DT)
        const p = toneProgress(f.elapsed)
        f.to.forEach((target, i) => {
          lerped.lerpColors(f.from[i]!, target, p)
          mesh.setColorAt(i, lerped)
          tone.current.cur[i] = tone.current.cur[i] ?? new Color()
          tone.current.cur[i]!.copy(lerped)
        })
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        if (f.elapsed >= TONE_FADE_SEC) {
          tone.current.fade = null
          tone.current.cur = f.to
          setFading(false)
        }
      }
    }
    const a = anim.current
    if (!a.dirty && Math.abs(explode - a.explode) < 1e-3) return
    const next = approach(a.explode, explode, Math.min(dt, MAX_FRAME_DT))
    a.explode = Math.abs(next - explode) < 1e-3 ? explode : next
    a.dirty = false
    voxels.forEach((v, i) => {
      const [x, y, z] = voxelPosition(v, w, d)
      dummy.position.set(x, y + explodeOffsetY(v.group, a.explode, looks.length), z)
      const hidden = cut !== null && isHidden(v, cut)
      dummy.scale.setScalar(hidden ? 0 : VOXEL_SCALE)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    if (a.explode !== explode) invalidate()
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 4) return // 拖曳轉視角不算點選
    if (e.instanceId === undefined) return
    const v = voxels[e.instanceId]
    if (v && !(damaged?.has(v))) onPick?.(v.group)
  }

  const press = useLongPress((e) => {
    const v = e.instanceId === undefined ? undefined : voxels[e.instanceId]
    if (v && !damaged?.has(v)) onPick?.(v.group)
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, voxels.length]} onClick={handleClick} {...press} castShadow receiveShadow>
      <boxGeometry />
      <BlockMaterial kind={kind} quality={quality} />
    </instancedMesh>
  )
}
