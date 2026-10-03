import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { type InstancedMesh, Object3D } from 'three'
import type { Vec3 } from './camera'
import { useContinuousRender } from './useContinuousRender'
import { COIN_HEIGHT, COIN_RADIUS, coinPositions } from './layout/coins'

type Props = { from: Vec3; to: Vec3; rate: number; fallTime?: number; arc?: number; active?: boolean; size?: number; limit?: number }

export function CoinMaterial() {
  return <meshStandardMaterial color="#ffd54f" metalness={0.5} roughness={0.3} emissive="#7a5a00" emissiveIntensity={0.25} />
}

/** 從 from 持續拋出金幣到 to（股利、利息、配息） */
export function CoinDrip(props: Props) {
  if (!(props.rate > 0 && (props.fallTime ?? 1.2) > 0)) return null
  return <CoinDripInner {...props} />
}

function CoinDripInner({ from, to, rate, fallTime = 1.2, arc = 1.5, active = true, size = 1, limit }: Props) {
  const max = Math.ceil(rate * fallTime) + 1
  const ref = useRef<InstancedMesh>(null)
  const t0 = useRef<number | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useContinuousRender(active)
  // active 變成 false 時再畫一幀，把金幣清掉
  useEffect(() => {
    invalidate()
  }, [active, invalidate])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const pts = active ? coinPositions(clock.elapsedTime - t0.current, { from, to, rate, fallTime, arc, limit }, max) : []
    for (let i = 0; i < max; i++) {
      const pt = pts[i]
      if (pt) {
        dummy.position.set(...pt)
        dummy.rotation.set(Math.PI / 2, 0, clock.elapsedTime * 4 + i)
        dummy.scale.setScalar(size)
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, max]} frustumCulled={false}>
      <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 20]} />
      <CoinMaterial />
    </instancedMesh>
  )
}
