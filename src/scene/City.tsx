import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D, Vector3 } from 'three'
import { universe } from '../data'
import { makeTextContext } from '../tour/context'
import { useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { useThemeStore } from '../store/theme'
import { T } from '../ui/strings'
import { NameLabel } from './NameLabel'
import { displayName } from '../ui/names'
import { lookFor } from './palette'
import { fadedColor, toneColor } from './layout/tone'
import type { Theme } from './theme'

/** 島也往背景色混（不降飽和，島本來就是淡色） */
const fadedIsland = (hex: string, theme: Theme): string => `#${new Color(hex).lerp(new Color(theme.sea), CITY_FADE_ISLAND).getHexString()}`
const CITY_FADE_ISLAND = 0.5
import { VOXEL_SCALE } from './layout/voxels'
import { THEMES } from './theme'
import { useLongPress } from './useLongPress'
import { prefersReducedMotion, useRevealAfterCamera } from './useRevealAfterCamera'
import { applyShrink, BUILDING_SPACING, buildingVoxels, CITY_LABELS_PER_ISLAND, cityLayout, declutterLabels, islandSize, ISLAND_CENTERS, labeledBuildings, labelWidth, mentionedBuildings, type LabelBox, type Region } from './layout/city'
import type { Vec3 } from './camera'
import type { TextContext } from '../tour/types'
import { lineOf } from '../tour/engine'

const textCtx = makeTextContext(universe)

/** 名稱標籤的高度估計（像素） */
const LABEL_H = 22
/** 步驟標註（錨在大樓上）在螢幕上大約的框（像素）：名稱讓開它 */
const CALLOUT_BOX = { w: 110, h: 40, lift: 1.5 }

type NameItem = { id: string; text: string; position: Vec3; active: boolean }

/**
 * 城市名稱：每座島最多三棟（加上選到的），而且在螢幕上不互相疊、不壓到步驟標註（r3）。
 * 每畫一幀把錨點投影到螢幕上，依高度順序放，疊到就不放；顯示的名單變了才重畫。
 */
function CityNames({ items, obstacles, mentioned }: { items: NameItem[]; obstacles: Vec3[]; mentioned: ReadonlySet<string> }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set())
  const key = useRef('')
  const v = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const project = (p: Vec3, id: string, w: number, h: number, dy = 0): LabelBox => {
      v.set(p[0], p[1], p[2]).project(camera)
      return { id, x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height + dy, w, h, behind: v.z > 1 }
    }
    const boxes = items.map((it) => project(it.position, it.id, labelWidth(it.text), LABEL_H))
    const obs = obstacles.map((p, i) => project([p[0], p[1] + CALLOUT_BOX.lift, p[2]], `callout-${i}`, CALLOUT_BOX.w, CALLOUT_BOX.h))
    const forced = new Set(items.filter((it) => it.active).map((it) => it.id))
    const keep = declutterLabels(boxes, obs, forced, 3, mentioned)
    const k = keep.join(',')
    if (k !== key.current) {
      key.current = k
      setShown(new Set(keep))
      invalidate() // 新掛上的名稱標籤要再畫一幀才會定位
    }
  })
  return (
    <>
      {items.filter((it) => shown.has(it.id)).map((it) => (
        <NameLabel key={it.id} position={it.position} text={it.text} active={it.active} className="name-label--city" />
      ))}
    </>
  )
}
/** 後排的標籤抬高（每往後一排加這麼多）：俯視時前後排同一直行的名字才不會疊在一起 */
const LABEL_LIFT_PER_ROW = 1.6

const ISLAND_THICKNESS = 0.5

/** 兩座島與大樓；每棟大樓是一根方塊柱，所有大樓共用一個 InstancedMesh */
export function City({ labels, islandLabels = true, shrink, dim = false }: { labels: boolean; islandLabels?: boolean; shrink?: Readonly<Record<string, number>>; dim?: boolean }) {
  const base = useMemo(() => cityLayout([...universe.values()]), [])
  const placements = useMemo(() => (shrink ? applyShrink(base, shrink, (id) => universe.get(id)?.marketCapUsdB) : base), [base, shrink])
  const voxels = useMemo(() => buildingVoxels(placements), [placements])
  const ref = useRef<InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const pick = useSandbox((s) => s.pick)
  const theme = useThemeStore((s) => s.theme)
  const picked = useSandbox((s) => s.picked)
  const pickedId = picked?.productId ?? null
  // 從籃子選到某層持股（holdingId）時，若那是城市裡的公司，那棟大樓也一起鮮豔
  const pickedHolding = picked?.holdingId ?? null
  // 導覽步驟標註錨在某棟大樓：那棟鮮豔；名稱由標註顯示，NameLabel 隱藏以免重複（字串 key 讓 selector 穩定）
  const anchorKey = useTour((s) =>
    s.mode === 'tour' ? (currentStep(s).callouts ?? []).flatMap((c) => (c.anchor.kind === 'building' ? [c.anchor.id] : [])).join(',') : '',
  )
  const anchored = useMemo(() => new Set(anchorKey === '' ? [] : anchorKey.split(',')), [anchorKey])
  // 這一步的一句話與標註提到的名字（字串 key 讓 selector 穩定）
  const mentionText = useTour((s) => {
    if (s.mode !== 'tour') return ''
    const st = currentStep(s)
    const t = (v: string | ((c: TextContext) => string) | undefined) => (typeof v === 'function' ? v(textCtx) : v ?? '')
    return [lineOf(st, textCtx), ...(st.callouts ?? []).flatMap((c) => [t(c.title), t(c.sub)])].join('\n')
  })
  const stepId = useTour((s) => currentStep(s).id)
  const [instant] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(stepId, instant)
  // 3b1b：鏡頭停下後，被標註的大樓才轉成鮮豔色
  const isActive = (id: string) => pickedId === id || pickedHolding === id || (revealed && anchored.has(id))

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    voxels.forEach((v, i) => {
      o.position.set(v.x, v.y, v.z)
      o.scale.setScalar(VOXEL_SCALE)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      const hex = lookFor(universe.get(v.id)!).color
      c.set(isActive(v.id) ? toneColor(hex, 'vivid', THEMES[theme]) : dim ? fadedColor(hex, THEMES[theme]) : toneColor(hex, 'muted', THEMES[theme]))
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [voxels, pickedId, pickedHolding, anchored, revealed, theme, dim, invalidate])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 4) return // 拖曳轉視角不算點選
    if (e.instanceId === undefined) return
    const v = voxels[e.instanceId]
    if (v) pick({ productId: v.id, holdingId: v.id })
  }

  const press = useLongPress((e) => {
    const v = e.instanceId === undefined ? undefined : voxels[e.instanceId]
    if (v) pick({ productId: v.id, holdingId: v.id })
  })

  const mentioned = useMemo(() => mentionedBuildings(placements, [mentionText], (id) => displayName(universe, id)), [placements, mentionText])

  const labeledPlacements = useMemo(() => {
    const extra = [pickedId, pickedHolding].filter((x): x is string => x !== null)
    const ids = labeledBuildings(placements, CITY_LABELS_PER_ISLAND, [...extra, ...mentioned])
    // 高的先放（名字疊到時留高的）
    return placements.filter((p) => ids.has(p.id) && !anchored.has(p.id)).sort((a, b) => b.height - a.height)
  }, [placements, pickedId, pickedHolding, anchored, mentioned])

  const frontZ = useMemo(() => {
    const z = { TW: -Infinity, US: -Infinity }
    // 只看有標名的大樓：最前面那排不抬高，往後每排抬一點
    for (const p of labeledPlacements) z[p.region] = Math.max(z[p.region], p.z)
    return z
  }, [labeledPlacements])

  const nameItems = useMemo<NameItem[]>(
    () =>
      labeledPlacements.map((p) => ({
        id: p.id,
        text: displayName(universe, p.id),
        position: [p.x, p.height + 0.8 + ((frontZ[p.region] - p.z) / BUILDING_SPACING) * LABEL_LIFT_PER_ROW, p.z],
        active: pickedId === p.id || pickedHolding === p.id,
      })),
    [labeledPlacements, frontZ, pickedId, pickedHolding],
  )
  // 步驟標註錨在這些大樓頂上：名稱要讓開
  const anchorTops = useMemo<Vec3[]>(() => placements.filter((p) => anchored.has(p.id)).map((p) => [p.x, p.height + 0.2, p.z]), [placements, anchored])

  const sizeOf = (region: Region) => islandSize(placements.filter((p) => p.region === region).length)

  return (
    <group>
      {(['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        const size = sizeOf(region)
        return (
          <group key={region}>
            <mesh position={[x, -ISLAND_THICKNESS / 2, z]} receiveShadow>
              <boxGeometry args={[size, ISLAND_THICKNESS, size]} />
              <meshStandardMaterial color={dim ? fadedIsland(THEMES[theme].island[region], THEMES[theme]) : THEMES[theme].island[region]} />
            </mesh>
          </group>
        )
      })}
      <instancedMesh key={voxels.length} ref={ref} args={[undefined, undefined, voxels.length]} castShadow receiveShadow onClick={onClick} {...press}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {/* NameLabel 自己在第一個 tick 後才掛 Html，並受「標註」開關控制 */}
      {labels && <CityNames items={nameItems} obstacles={anchorTops} mentioned={mentioned} />}
      {islandLabels && (['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        return <NameLabel key={`island-${region}`} position={[x, 0.2, z + sizeOf(region) / 2 + 1]} text={T.islands[region]} className="name-label--island" />
      })}
    </group>
  )
}
