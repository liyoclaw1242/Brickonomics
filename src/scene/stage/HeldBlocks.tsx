import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'
import { universe } from '../../data'
import type { HeldItem } from '../../tour/types'
import { T } from '../../ui/strings'
import { approach, MAX_FRAME_DT } from '../layout/voxels'
import { labelStyle } from '../labelStyle'
import { lookFor } from '../palette'
import { useContinuousRender } from '../useContinuousRender'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const SIZE = 2.4
const SPACING = 7
const TARGET_SCALE = { still: 1, up: 1.3, down: 0.7, shake: 1 } as const

function HeldBlock({ item, x }: { item: HeldItem; x: number }) {
  const ref = useRef<Mesh>(null)
  const ready = useAfterFirstTick()
  const asset = universe.get(item.assetId)!
  const look = lookFor(asset)
  useContinuousRender()
  useFrame(({ clock }, dt) => {
    const m = ref.current
    if (!m) return
    const s = approach(m.scale.x, TARGET_SCALE[item.motion], Math.min(dt, MAX_FRAME_DT), 3)
    m.scale.setScalar(s)
    const amp = item.motion === 'shake' ? (item.amplitude ?? 0.15) : 0
    const t = clock.elapsedTime
    m.position.set(Math.sin(t * 9) * amp, (SIZE / 2) * s + Math.abs(Math.sin(t * 6.3)) * amp * 0.6, 0)
    m.rotation.z = Math.sin(t * 7.1) * amp * 0.15
  })
  return (
    <group position={atPlaza(x, 0, 0)}>
      <mesh ref={ref} castShadow>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
        <meshStandardMaterial color={look.color} emissive={item.motion === 'up' ? look.color : '#000000'} emissiveIntensity={item.motion === 'up' ? 0.25 : 0} />
      </mesh>
      {ready && (
        <Html position={[0, SIZE * 2, 0]} center style={labelStyle}>
          {asset.name}
          {item.motion !== 'still' && T.stage.illustrativeTag}
        </Html>
      )}
    </group>
  )
}

/** 「從大樓抽出一顆方塊放進口袋」 */
export function HeldBlocks({ items }: { items: HeldItem[] }) {
  const start = -((items.length - 1) * SPACING) / 2
  return (
    <>
      {items.map((it, i) => (
        <HeldBlock key={it.assetId} item={it} x={start + i * SPACING} />
      ))}
    </>
  )
}
