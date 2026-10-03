import { Line } from '@react-three/drei'
import { DoubleSide } from 'three'
import { cutPlanePosition, type CutSpec } from './layout/voxels'

const PAD = 1
const FRAME_COLOR = '#ff2d6f'

type Plane = { position: [number, number, number]; rotation: [number, number, number]; size: [number, number] }

/** 切面的位置、旋轉與大小；四種軸共用同一套算法 */
function planeFor(cut: CutSpec, w: number, d: number, height: number): Plane {
  // isHidden 隱藏 v >= threshold，所以第一個被隱藏的索引是 ceil(threshold)；切面貼齊方塊面
  const p = cutPlanePosition({ ...cut, threshold: Math.ceil(cut.threshold) }, w, d)
  switch (cut.axis) {
    case 'd':
      // 平面 x + z = p：離原點最近的點是 (p/2, ·, p/2)，法向量 (1,0,1)/√2 → 繞 y 轉 π/4
      return { position: [p / 2, height / 2, p / 2], rotation: [0, Math.PI / 4, 0], size: [Math.hypot(w, d) + PAD, height + PAD] }
    case 'y':
      return { position: [0, p, 0], rotation: [-Math.PI / 2, 0, 0], size: [w + PAD, d + PAD] }
    case 'x':
      return { position: [p, height / 2, 0], rotation: [0, Math.PI / 2, 0], size: [d + PAD, height + PAD] }
    case 'z':
      return { position: [0, height / 2, p], rotation: [0, 0, 0], size: [w + PAD, height + PAD] }
  }
}

/** 雷射刀的切面：淡淡的填色加一圈亮色外框（填色太濃會把底下方塊的顏色蓋掉）；height 為籃子含拆開位移的總高 */
export function LaserPlane({ cut, w, d, height }: { cut: CutSpec; w: number; d: number; height: number }) {
  const { position, rotation, size } = planeFor(cut, w, d, height)
  const [hw, hh] = [size[0] / 2, size[1] / 2]
  const corners: [number, number, number][] = [
    [-hw, -hh, 0],
    [hw, -hh, 0],
    [hw, hh, 0],
    [-hw, hh, 0],
    [-hw, -hh, 0],
  ]
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial color={FRAME_COLOR} transparent opacity={0.07} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={corners} color={FRAME_COLOR} lineWidth={3} toneMapped={false} />
    </group>
  )
}
