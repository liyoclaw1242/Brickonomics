import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { EXCHANGE_POSITION } from './plaza'
import type { Vec3 } from '../camera'
import { useContinuousRender } from '../useContinuousRender'

/** 車身顏色：第一位經理人黃色；另一位經理人青綠色（一眼看得出換了人） */
const BODY = { first: '#f9a825', other: '#26a69a' } as const

/** 方塊組成的小怪手（經理人），手臂來回擺動；other＝另一位經理人；at＝放在哪（預設交易所籃子的左邊） */
export function Excavator({ other = false, at }: { other?: boolean; at?: Vec3 }) {
  const body = other ? BODY.other : BODY.first
  const arm = useRef<Group>(null)
  useContinuousRender()
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = -0.5 + Math.sin(clock.elapsedTime * 1.4) * 0.35
  })
  const [x, , z] = EXCHANGE_POSITION
  return (
    <group position={at ?? [x - 10, 0, z + 1]} rotation-y={0.4}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3.2, 1, 2.2]} />
        <meshStandardMaterial color="#37474f" />
      </mesh>
      <mesh position={[-0.3, 1.8, 0]} castShadow>
        <boxGeometry args={[1.8, 1.6, 1.8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <group ref={arm} position={[0.6, 2.4, 0]}>
        <mesh position={[1.8, 0, 0]} castShadow>
          <boxGeometry args={[3.6, 0.5, 0.6]} />
          <meshStandardMaterial color={body} />
        </mesh>
        <mesh position={[3.7, -0.6, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 1]} />
          <meshStandardMaterial color="#455a64" />
        </mesh>
      </group>
      <Callout anchor={[0, 2.7, 0]} offset={[0, 1.5, 0]} title={other ? T.excavatorOther : T.excavator} color={other ? body : undefined} persistent={other} />
    </group>
  )
}
