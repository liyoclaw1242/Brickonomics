import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { SHOCK_2330 } from '../tour/context'
import { BasketView } from './BasketView'
import { FrameCounter } from './FrameCounter'
import { CameraRig } from './CameraRig'
import { City } from './City'
import { QUALITY, type Quality } from './quality'
import { damageFromShocks } from './layout/stages'
import { EXCHANGE_POSITION } from './stage/plaza'
import { StageView } from './stage/StageView'
import { ViewFraming } from './ViewFraming'

const PEDESTAL_HEIGHT = 0.6
const SHOCK_SHRINK = damageFromShocks(SHOCK_2330)

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
  const mode = useTour((s) => s.mode)
  const tourScene = useTour((s) => currentStep(s).scene)
  const explode = useSandbox(effectiveExplode)
  const labels = mode === 'tour' ? tourScene.cityLabels !== false : explode < 0.3
  const shrink = mode === 'tour' && tourScene.stage?.kind === 'shock' && tourScene.stage.active ? SHOCK_SHRINK : undefined
  return (
    <>
      <color attach="background" args={['#cfe8ff']} />
      <hemisphereLight args={['#ffffff', '#b0c4de', 0.8]} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.6}
        castShadow={QUALITY[quality].shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Environment resolution={64} frames={1} environmentIntensity={0.25}>
        <Lightformer form="rect" intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[12, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[12, 8, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#6fb4e8" />
      </mesh>
      <ViewFraming />
      <City labels={labels} islandLabels={mode !== 'tour' || tourScene.cityLabels !== false} shrink={shrink} />
      <Pedestal />
      <StageView quality={quality} />
      {productId && (
        <BasketView
          key={`${productId}-${quality}`}
          productId={productId}
          quality={quality}
          position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT, EXCHANGE_POSITION[2]]}
        />
      )}
      <OrbitControls makeDefault target={[0, 5, 12]} maxPolarAngle={Math.PI * 0.48} minDistance={8} maxDistance={90} />
      <CameraRig />
      {import.meta.env.DEV && <FrameCounter />}
    </>
  )
}
