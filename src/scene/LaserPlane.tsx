import { DoubleSide } from 'three'
import { cutPlanePosition, type CutSpec } from './layout/voxels'

const PAD = 1

function LaserMaterial() {
  return <meshBasicMaterial color="#ff2d6f" transparent opacity={0.28} side={DoubleSide} depthWrite={false} />
}

/** 雷射刀的切面；height 為籃子含拆開位移的總高 */
export function LaserPlane({ cut, w, d, height }: { cut: CutSpec; w: number; d: number; height: number }) {
  // isHidden 隱藏 v >= threshold，所以第一個被隱藏的索引是 ceil(threshold)；切面貼齊方塊面
  const p = cutPlanePosition({ ...cut, threshold: Math.ceil(cut.threshold) }, w, d)
  if (cut.axis === 'y') {
    return (
      <mesh position={[0, p, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w + PAD, d + PAD]} />
        <LaserMaterial />
      </mesh>
    )
  }
  if (cut.axis === 'x') {
    return (
      <mesh position={[p, height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[d + PAD, height + PAD]} />
        <LaserMaterial />
      </mesh>
    )
  }
  return (
    <mesh position={[0, height / 2, p]}>
      <planeGeometry args={[w + PAD, height + PAD]} />
      <LaserMaterial />
    </mesh>
  )
}
