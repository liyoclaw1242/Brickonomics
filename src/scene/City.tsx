import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, type InstancedMesh, Object3D } from 'three'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { T } from '../ui/strings'
import { lookFor } from './palette'
import { VOXEL_SCALE } from './layout/voxels'
import { buildingVoxels, cityLayout, islandSize, ISLAND_CENTERS, type Region } from './layout/city'

const ISLAND_COLORS: Record<Region, string> = { TW: '#a5d6a7', US: '#e6d3a3' }
const ISLAND_THICKNESS = 0.5

const labelStyle = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
  padding: '1px 6px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  color: '#1f2933',
} as const

/** 兩座島與大樓；每棟大樓是一根方塊柱，所有大樓共用一個 InstancedMesh */
export function City() {
  const placements = useMemo(() => cityLayout([...universe.values()]), [])
  const voxels = useMemo(() => buildingVoxels(placements), [placements])
  const ref = useRef<InstancedMesh>(null)
  const pick = useSandbox((s) => s.pick)

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
      c.set(lookFor(universe.get(v.id)!).color)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxels])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const v = voxels[e.instanceId]
    if (v) pick({ productId: v.id, holdingId: v.id })
  }

  return (
    <group>
      {(['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        const size = islandSize(placements.filter((p) => p.region === region).length)
        return (
          <group key={region}>
            <mesh position={[x, -ISLAND_THICKNESS / 2, z]} receiveShadow>
              <boxGeometry args={[size, ISLAND_THICKNESS, size]} />
              <meshStandardMaterial color={ISLAND_COLORS[region]} />
            </mesh>
            <Html position={[x, 0.2, z + size / 2 + 1]} center distanceFactor={40} style={{ ...labelStyle, fontSize: 16, fontWeight: 600 }}>
              {T.islands[region]}
            </Html>
          </group>
        )
      })}
      <instancedMesh ref={ref} args={[undefined, undefined, voxels.length]} castShadow receiveShadow onClick={onClick}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {placements.map((p) => (
        <Html key={p.id} position={[p.x, p.height + 0.8, p.z]} center distanceFactor={38} style={labelStyle}>
          {universe.get(p.id)!.name}
        </Html>
      ))}
    </group>
  )
}
