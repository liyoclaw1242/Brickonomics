import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { QUALITY, detectQuality, readEnv } from './scene/quality'
import { useSandbox } from './store/sandbox'

export default function App() {
  const quality = useMemo(() => detectQuality(readEnv()), [])
  const cfg = QUALITY[quality]
  const pick = useSandbox((s) => s.pick)
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows={cfg.shadows} dpr={cfg.dpr} camera={{ position: [10, 36, 58], fov: 45 }} onPointerMissed={() => pick(null)}>
        <Scene quality={quality} />
      </Canvas>
    </div>
  )
}
