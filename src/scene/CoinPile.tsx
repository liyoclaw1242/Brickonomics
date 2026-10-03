import { useLayoutEffect, useMemo, useRef } from 'react'
import { type InstancedMesh, Object3D } from 'three'
import type { Vec3 } from './camera'
import { COIN_HEIGHT, COIN_RADIUS, coinPileLayout } from './layout/coins'
import { CoinMaterial } from './CoinDrip'

/** 一堆金幣（數量即金額，單位由呼叫端決定） */
export function CoinPile({ count: rawCount, position }: { count: number; position: Vec3 }) {
  const count = Math.max(0, Math.round(rawCount))
  const pts = useMemo(() => coinPileLayout(count), [count])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    pts.forEach((p, i) => {
      o.position.set(...p)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [pts])
  if (count === 0) return null
  return (
    <group position={position}>
      <instancedMesh key={count} ref={ref} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 20]} />
        <CoinMaterial />
      </instancedMesh>
    </group>
  )
}
