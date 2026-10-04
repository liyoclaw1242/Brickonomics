import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { useThemeStore } from '../store/theme'
import { T } from '../ui/strings'
import { NameLabel } from './NameLabel'
import { lookFor } from './palette'
import { toneColor } from './layout/tone'
import { VOXEL_SCALE } from './layout/voxels'
import { THEMES } from './theme'
import { useLongPress } from './useLongPress'
import { prefersReducedMotion, useRevealAfterCamera } from './useRevealAfterCamera'
import { applyShrink, BUILDING_SPACING, buildingVoxels, cityLayout, islandSize, ISLAND_CENTERS, labeledBuildings, type Region } from './layout/city'

/** 每座島只標最高的幾棟（使用者測試：名字太多、太小、互相疊在一起） */
const LABELS_PER_ISLAND = 5
/** 後排的標籤抬高（每往後一排加這麼多）：俯視時前後排同一直行的名字才不會疊在一起 */
const LABEL_LIFT_PER_ROW = 1.6

const ISLAND_THICKNESS = 0.5

/** 兩座島與大樓；每棟大樓是一根方塊柱，所有大樓共用一個 InstancedMesh */
export function City({ labels, islandLabels = true, shrink }: { labels: boolean; islandLabels?: boolean; shrink?: Readonly<Record<string, number>> }) {
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
      c.set(toneColor(lookFor(universe.get(v.id)!).color, isActive(v.id) ? 'vivid' : 'muted', THEMES[theme]))
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [voxels, pickedId, pickedHolding, anchored, revealed, theme, invalidate])

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

  const labeledPlacements = useMemo(() => {
    const extra = [pickedId, pickedHolding].filter((x): x is string => x !== null)
    const ids = labeledBuildings(placements, LABELS_PER_ISLAND, extra)
    return placements.filter((p) => ids.has(p.id) && !anchored.has(p.id))
  }, [placements, pickedId, pickedHolding, anchored])

  const frontZ = useMemo(() => {
    const z = { TW: -Infinity, US: -Infinity }
    // 只看有標名的大樓：最前面那排不抬高，往後每排抬一點
    for (const p of labeledPlacements) z[p.region] = Math.max(z[p.region], p.z)
    return z
  }, [labeledPlacements])

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
              <meshStandardMaterial color={THEMES[theme].island[region]} />
            </mesh>
          </group>
        )
      })}
      <instancedMesh key={voxels.length} ref={ref} args={[undefined, undefined, voxels.length]} castShadow receiveShadow onClick={onClick} {...press}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {/* NameLabel 自己在第一個 tick 後才掛 Html，並受「標註」開關控制 */}
      {labels && labeledPlacements.map((p) => (
        <NameLabel
          key={p.id}
          position={[p.x, p.height + 0.8 + ((frontZ[p.region] - p.z) / BUILDING_SPACING) * LABEL_LIFT_PER_ROW, p.z]}
          text={universe.get(p.id)!.name}
          active={pickedId === p.id || pickedHolding === p.id}
          className="name-label--city"
        />
      ))}
      {islandLabels && (['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        return <NameLabel key={`island-${region}`} position={[x, 0.2, z + sizeOf(region) / 2 + 1]} text={T.islands[region]} className="name-label--island" />
      })}
    </group>
  )
}
