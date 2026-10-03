import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#cfe8ff' }}>
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 3]} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="#f4a261" />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
