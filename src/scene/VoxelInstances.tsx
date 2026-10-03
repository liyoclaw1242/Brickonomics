import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import type { BlockLook, MaterialKind } from './palette'
import { BlockMaterial } from './materials'
import type { Quality } from './quality'
import { useLongPress } from './useLongPress'
import { approach, explodeOffsetY, MAX_FRAME_DT, isHidden, voxelPosition, VOXEL_SCALE, type CutSpec, type Voxel } from './layout/voxels'

type Props = {
  voxels: Voxel[]
  looks: BlockLook[]
  w: number
  d: number
  explode: number
  cut: CutSpec | null
  highlightGroup: number | null
  quality: Quality
  damaged?: ReadonlySet<Voxel>
  onPick?: (group: number) => void
}

const DIM = 0.35
const DAMAGE_COLOR = new Color('#e53935')
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

function KindMesh({ kind, voxels, looks, w, d, explode, cut, highlightGroup, quality, damaged, onPick }: Props & { kind: MaterialKind }) {
  const ref = useRef<InstancedMesh>(null)
  const anim = useRef({ explode, dirty: true })
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const c = new Color()
    voxels.forEach((v, i) => {
      c.set(looks[v.group]!.color)
      if (highlightGroup !== null && v.group !== highlightGroup) c.multiplyScalar(DIM)
      if (damaged?.has(v)) c.lerp(DAMAGE_COLOR, DAMAGE_MIX)
      mesh.setColorAt(i, c)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    invalidate()
  }, [voxels, looks, highlightGroup, damaged, invalidate])

  useLayoutEffect(() => {
    anim.current.dirty = true
    invalidate()
  }, [voxels, cut, w, d, invalidate])

  // explode 是普通 prop（非 three 物件屬性），變動不會自動觸發重繪
  useLayoutEffect(() => {
    invalidate()
  }, [explode, invalidate])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
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
