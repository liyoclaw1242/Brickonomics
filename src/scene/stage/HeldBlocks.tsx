import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Callout } from '../Callout'
import type { Mesh } from 'three'
import { universe } from '../../data'
import type { HeldItem } from '../../tour/types'
import { approach, MAX_FRAME_DT } from '../layout/voxels'
import { HELD_SCALE } from '../layout/stages'
import { Edges } from '@react-three/drei'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { lookFor } from '../palette'
import { acquire } from '../continuous'
import { atPlaza } from './plaza'
import { displayName } from '../../ui/names'

const SIZE = 2.4
const SPACING = 7
const TARGET_SCALE = HELD_SCALE

function HeldBlock({ item, x }: { item: HeldItem; x: number }) {
  const ref = useRef<Mesh>(null)
  const asset = universe.get(item.assetId)!
  const look = lookFor(asset)
  const invalidate = useThree((st) => st.invalidate)
  const release = useRef<(() => void) | null>(null)
  const line = THEMES[useThemeStore((st) => st.theme)].calloutLine
  // 動作改變（或剛掛載）時要重新開始畫；卸載時歸還持續繪製登記
  useEffect(() => {
    invalidate()
    return () => {
      release.current?.()
      release.current = null
    }
  }, [item.motion, invalidate])
  useFrame(({ clock }, dt) => {
    const m = ref.current
    if (!m) return
    const target = TARGET_SCALE[item.motion]
    let s = approach(m.scale.x, target, Math.min(dt, MAX_FRAME_DT), 3)
    // 只有在晃動或縮放尚未收斂時才需要連續繪製；收斂後貼齊目標，這一幀畫完就停
    const moving = item.motion !== 'still' || Math.abs(s - target) > 1e-3
    if (!moving) s = target
    m.scale.setScalar(s)
    const amp = item.motion === 'shake' ? (item.amplitude ?? 0.15) : 0
    const t = clock.elapsedTime
    m.position.set(Math.sin(t * 9) * amp, (SIZE / 2) * s + Math.abs(Math.sin(t * 6.3)) * amp * 0.6, 0)
    m.rotation.z = Math.sin(t * 7.1) * amp * 0.15
    if (moving) {
      if (!release.current) release.current = acquire()
      invalidate()
    } else {
      release.current?.()
      release.current = null
    }
  })
  return (
    <group position={atPlaza(x, 0, 0)}>
      <mesh ref={ref} castShadow>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
        <meshStandardMaterial color={look.color} emissive={item.motion === 'up' ? look.color : '#000000'} emissiveIntensity={item.motion === 'up' ? 0.25 : 0} />
      </mesh>
      {/* 原來大小的虛框：變大、變小有個比較的基準（r3：只大一點點看不出來） */}
      {(item.motion === 'up' || item.motion === 'down') && (
        <mesh position={[0, SIZE / 2, 0]}>
          <boxGeometry args={[SIZE, SIZE, SIZE]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={line} />
        </mesh>
      )}
      {/* 標註放在方塊前方的地上（鏡頭從上往下看，放頭頂會蓋住方塊）；示意標示只在面板標題旁出現一次 */}
      <Callout anchor={[0, 0.1, (SIZE * TARGET_SCALE[item.motion]) / 2]} offset={[0, -0.3, 1.6]} title={displayName(universe, item.assetId)} persistent={item.motion !== 'still'} />
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
