import { OrbitControls } from '@react-three/drei'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { SHOCK_2330 } from '../tour/context'
import { BasketView } from './BasketView'
import { FrameCounter } from './FrameCounter'
import { CameraRig } from './CameraRig'
import { City } from './City'
import { Lighting } from './Lighting'
import type { Quality } from './quality'
import { THEMES } from './theme'
import { useThemeStore } from '../store/theme'
import { damageFromShocks } from './layout/stages'
import { MAX_DISTANCE, MAX_POLAR, MIN_DISTANCE } from './camera'
import { cityNamesOnPlaza, EXCHANGE_POSITION, PEDESTAL_HEIGHT } from './stage/plaza'
import { StageView } from './stage/StageView'
import { StepCallouts } from './StepCallouts'
import { ViewFraming } from './ViewFraming'

const SHOCK_SHRINK = damageFromShocks(SHOCK_2330)

function Pedestal() {
  const t = THEMES[useThemeStore((s) => s.theme)]
  return (
    <mesh position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT / 2, EXCHANGE_POSITION[2]]} receiveShadow castShadow>
      <boxGeometry args={[12, PEDESTAL_HEIGHT, 12]} />
      <meshStandardMaterial color={t.pedestal} />
    </mesh>
  )
}

export function Scene({ quality }: { quality: Quality }) {
  const t = THEMES[useThemeStore((s) => s.theme)]
  const productId = useSandbox((s) => s.productId)
  const mode = useTour((s) => s.mode)
  const tourScene = useTour((s) => currentStep(s).scene)
  const explode = useSandbox(effectiveExplode)
  const tourNames = tourScene.cityLabels !== false && cityNamesOnPlaza(tourScene.stage?.kind ?? 'none')
  const labels = mode === 'tour' ? tourNames : explode < 0.3
  const shrink = mode === 'tour' && tourScene.stage?.kind === 'shock' && tourScene.stage.active ? SHOCK_SHRINK : undefined
  return (
    <>
      <Lighting quality={quality} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={t.sea} />
      </mesh>
      <ViewFraming />
      <City labels={labels} islandLabels={mode !== 'tour' || tourNames} shrink={shrink} />
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
      {mode === 'tour' && <StepCallouts quality={quality} />}
      <OrbitControls makeDefault target={[0, 5, 12]} maxPolarAngle={MAX_POLAR} minDistance={MIN_DISTANCE} maxDistance={MAX_DISTANCE} />
      <CameraRig />
      {import.meta.env.DEV && <FrameCounter />}
    </>
  )
}
