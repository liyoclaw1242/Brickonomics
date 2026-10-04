import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, type InstancedMesh, Object3D } from 'three'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { useThemeStore } from '../store/theme'
import { T } from '../ui/strings'
import { labelStyle } from './labelStyle'
import { lookFor } from './palette'
import { toneColor } from './layout/tone'
import { VOXEL_SCALE } from './layout/voxels'
import { THEMES } from './theme'
import { useAfterFirstTick } from './useAfterFirstTick'
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
  const labelsReady = useAfterFirstTick()
  const theme = useThemeStore((s) => s.theme)
  const picked = useSandbox((s) => s.picked)
  const pickedId = picked?.productId ?? null

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
      c.set(toneColor(lookFor(universe.get(v.id)!).color, pickedId === v.id ? 'vivid' : 'muted', THEMES[theme]))
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [voxels, pickedId, theme, invalidate])

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
      {labels && labelsReady && placements.map((p) => (
        <Html key={p.id} position={[p.x, p.height + 0.8, p.z]} center distanceFactor={38} style={labelStyle}>
          {universe.get(p.id)!.name}
        </Html>
      ))}
      {/* 島名標籤與大樓標籤都在 labelsReady 後才掛載 */}
      {islandLabels && labelsReady && (['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        return (
          <Html key={`island-${region}`} position={[x, 0.2, z + sizeOf(region) / 2 + 1]} center distanceFactor={40} style={{ ...labelStyle, fontSize: 16, fontWeight: 600 }}>
            {T.islands[region]}
          </Html>
        )
      })}
    </group>
  )
}
