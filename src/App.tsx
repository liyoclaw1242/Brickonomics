import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { QUALITY, detectQuality, readEnv } from './scene/quality'
import { useSandbox } from './store/sandbox'
import { SandboxPanel } from './ui/SandboxPanel'
import { PickInfoPanel } from './ui/PickInfoPanel'
import { Disclaimer } from './ui/Disclaimer'
import { useExplodeKey } from './ui/useExplodeKey'
import './ui/ui.css'

export default function App() {
  const quality = useMemo(() => detectQuality(readEnv()), [])
  const cfg = QUALITY[quality]
  const pick = useSandbox((s) => s.pick)
  useExplodeKey()
  return (
    <div className="app">
      <Canvas shadows={cfg.shadows} dpr={cfg.dpr} camera={{ position: [10, 36, 58], fov: 45 }} onPointerMissed={() => pick(null)}>
        <Scene quality={quality} />
      </Canvas>
      <SandboxPanel />
      <PickInfoPanel />
      <Disclaimer />
    </div>
  )
}
