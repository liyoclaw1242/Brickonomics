import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type InstancedMesh, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import type { Vec3 } from '../camera'
import type { Quality } from '../quality'
import { THEMES } from '../theme'

/** 烏雲：幾團扁平的低面數雲塊（相對雲中心的位置與大小） */
const PUFFS: { x: number; z: number; y: number; s: number }[] = [
  { x: 0, z: 0, y: 0.5, s: 3.2 },
  { x: 3, z: 0.8, y: 0.1, s: 2.6 },
  { x: -3, z: 0.5, y: 0.15, s: 2.7 },
  { x: 1.4, z: -2.6, y: 0.35, s: 2.4 },
  { x: -1.5, z: 2.4, y: 0.05, s: 2.3 },
  { x: 5.2, z: -0.7, y: -0.25, s: 1.8 },
  { x: -5, z: -0.9, y: -0.2, s: 1.9 },
  { x: -2.8, z: -2.4, y: 0.1, s: 2 },
  { x: 2.9, z: 2.6, y: -0.1, s: 1.9 },
]
const PUFFS_LOW = 5
const FLATTEN = 0.4

type Props = {
  quality: Quality
  position?: Vec3
  /** 雲塊位置的縮放（x、z）：拉寬成一整片 */
  spread?: [number, number]
  /** 雲塊大小倍數 */
  size?: number
  /** 雲塊輕輕上下浮動（呼叫端負責持續繪製）；false＝靜止 */
  bob?: boolean
}

/**
 * 暴風雲（龍捲風的頂蓋、閃電的烏雲共用）：一個 InstancedMesh、低面數二十面體壓扁。
 * 顏色取主題的 storm.cloud；bob 為 false 時只在掛載／換主題時擺一次，不要求重繪。
 */
export function StormCloud({ quality, position = [0, 0, 0], spread = [1, 1], size = 1, bob = false }: Props) {
  const puffs = quality === 'low' ? PUFFS.slice(0, PUFFS_LOW) : PUFFS
  const color = THEMES[useThemeStore((s) => s.theme)].storm.cloud
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const place = (time: number) => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]!
      const s = p.s * size
      dummy.position.set(p.x * spread[0], p.y * size + Math.sin(time * 0.8 + i) * 0.08, p.z * spread[1])
      dummy.rotation.set(0, i * 1.3, 0)
      dummy.scale.set(s, s * FLATTEN, s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => place(0))
  useFrame(({ clock }) => {
    if (bob) place(clock.elapsedTime)
  })
  return (
    <instancedMesh ref={ref} position={position} args={[undefined, undefined, puffs.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, quality === 'low' ? 0 : 1]} />
      <meshStandardMaterial color={color} flatShading roughness={1} />
    </instancedMesh>
  )
}
