import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Scene } from './scene/Scene'
import { QUALITY } from './scene/quality'
import { useQuality } from './store/quality'
import { useSandbox } from './store/sandbox'
import { useTour } from './store/tour'
import { TourPanel } from './ui/TourPanel'
import { SandboxPanel } from './ui/SandboxPanel'
import { PickInfoPanel } from './ui/PickInfoPanel'
import { Disclaimer } from './ui/Disclaimer'
import { QualityNotice } from './ui/QualityNotice'
import { useExplodeKey } from './ui/useExplodeKey'
import './ui/ui.css'

export default function App() {
  const quality = useQuality((s) => s.quality)
  const cfg = QUALITY[quality]
  const mode = useTour((s) => s.mode)
  const pick = useSandbox((s) => s.pick)
  useExplodeKey()
  return (
    <div className="app">
      <Canvas frameloop="demand" shadows={cfg.shadows} dpr={cfg.dpr} camera={{ position: [10, 36, 58], fov: 45 }} onPointerMissed={() => pick(null)}>
        <PerformanceMonitor onDecline={() => useQuality.getState().degrade()} />
        <Scene quality={quality} />
      </Canvas>
      {mode === 'tour' ? <TourPanel /> : <SandboxPanel />}
      <PickInfoPanel />
      <Disclaimer />
      <QualityNotice />
    </div>
  )
}
