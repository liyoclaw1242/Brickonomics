import { useLayoutEffect, useMemo, useRef } from 'react'
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
import { applyShrink, buildingVoxels, cityLayout, islandSize, ISLAND_CENTERS, type Region } from './layout/city'

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
  // 導覽步驟標註錨在某棟大樓：那棟鮮豔、名稱亮起（字串 key 讓 selector 穩定）
  const anchorKey = useTour((s) =>
    s.mode === 'tour' ? (currentStep(s).callouts ?? []).flatMap((c) => (c.anchor.kind === 'building' ? [c.anchor.id] : [])).join(',') : '',
  )
  const anchored = useMemo(() => new Set(anchorKey === '' ? [] : anchorKey.split(',')), [anchorKey])
  const isActive = (id: string) => pickedId === id || anchored.has(id)

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
  }, [voxels, pickedId, anchored, theme, invalidate])

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
      {labels && placements.map((p) => (
        <NameLabel key={p.id} position={[p.x, p.height + 0.8, p.z]} text={universe.get(p.id)!.name} active={isActive(p.id)} />
      ))}
      {islandLabels && (['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        return <NameLabel key={`island-${region}`} position={[x, 0.2, z + sizeOf(region) / 2 + 1]} text={T.islands[region]} className="name-label--island" />
      })}
    </group>
  )
}
