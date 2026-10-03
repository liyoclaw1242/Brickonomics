import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { EXCHANGE_POSITION } from './plaza'
import { useContinuousRender } from '../useContinuousRender'
import { useAfterFirstTick } from '../useAfterFirstTick'

/** 方塊組成的小怪手（經理人），手臂來回擺動 */
export function Excavator() {
  const arm = useRef<Group>(null)
  const ready = useAfterFirstTick()
  useContinuousRender()
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = -0.5 + Math.sin(clock.elapsedTime * 1.4) * 0.35
  })
  const [x, , z] = EXCHANGE_POSITION
  return (
    <group position={[x - 10, 0, z + 1]} rotation-y={0.4}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3.2, 1, 2.2]} />
        <meshStandardMaterial color="#37474f" />
      </mesh>
      <mesh position={[-0.3, 1.8, 0]} castShadow>
        <boxGeometry args={[1.8, 1.6, 1.8]} />
        <meshStandardMaterial color="#f9a825" />
      </mesh>
      <group ref={arm} position={[0.6, 2.4, 0]}>
        <mesh position={[1.8, 0, 0]} castShadow>
          <boxGeometry args={[3.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#f9a825" />
        </mesh>
        <mesh position={[3.7, -0.6, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 1]} />
          <meshStandardMaterial color="#455a64" />
        </mesh>
      </group>
      {ready && (
        <Html position={[0, 4.2, 0]} center style={labelStyle}>
          {T.excavator}
        </Html>
      )}
    </group>
  )
}
