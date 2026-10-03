import { OrbitControls } from '@react-three/drei'
import { useSandbox } from '../store/sandbox'
import { BasketView } from './BasketView'
import type { Quality } from './quality'

/** 交易所櫃台的位置：兩座島中間偏前 */
export const EXCHANGE_POSITION: [number, number, number] = [0, 0, 14]
const PEDESTAL_HEIGHT = 0.6

function Pedestal() {
  return (
    <mesh position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT / 2, EXCHANGE_POSITION[2]]} receiveShadow castShadow>
      <boxGeometry args={[12, PEDESTAL_HEIGHT, 12]} />
      <meshStandardMaterial color="#e9e4d8" />
    </mesh>
  )
}

export function Scene({ quality }: { quality: Quality }) {
  const productId = useSandbox((s) => s.productId)
  return (
    <>
      <color attach="background" args={['#cfe8ff']} />
      <hemisphereLight args={['#ffffff', '#b0c4de', 0.8]} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#9cc9e8" />
      </mesh>
      <Pedestal />
      {productId && (
        <BasketView
          key={`${productId}-${quality}`}
          productId={productId}
          quality={quality}
          position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT, EXCHANGE_POSITION[2]]}
        />
      )}
      <OrbitControls makeDefault target={[0, 8, 14]} maxPolarAngle={Math.PI * 0.48} minDistance={8} maxDistance={90} />
    </>
  )
}
