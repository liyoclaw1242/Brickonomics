import { currentStep, useTour } from '../../store/tour'
import type { Stage } from '../../tour/types'
import type { Quality } from '../quality'
import { AccumulateStage } from './AccumulateStage'
import { BondShowcase } from './BondShowcase'
import { Excavator } from './Excavator'
import { ExDividendStage } from './ExDividendStage'
import { FeeMeter } from './FeeMeter'
import { FeeRaceStage } from './FeeRaceStage'
import { HeldBlocks } from './HeldBlocks'
import { Plaza } from './Plaza'
import { PriceTicker } from './PriceTicker'
import { OverlapStage } from './OverlapStage'
import { PrincipalTrapStage } from './PrincipalTrapStage'
import { ShockStage } from './ShockStage'

const NONE: Stage = { kind: 'none' }
const ON_PLAZA = new Set<Stage['kind']>(['held', 'exdiv', 'bonds', 'feeRace', 'accumulate', 'principalTrap', 'shock', 'overlap'])

/** 依目前步驟顯示教學視覺；沙盒模式不顯示 */
export function StageView({ quality }: { quality: Quality }) {
  const stage = useTour((s) => (s.mode === 'tour' ? (currentStep(s).scene.stage ?? NONE) : NONE))
  return (
    <>
      {ON_PLAZA.has(stage.kind) && <Plaza />}
      {stage.kind === 'held' && <HeldBlocks items={stage.items} />}
      {stage.kind === 'bonds' && <BondShowcase stressed={stage.stressed} quality={quality} />}
      {stage.kind === 'exdiv' && <ExDividendStage outcome={stage.outcome} quality={quality} />}
      {stage.kind === 'feeRace' && <FeeRaceStage quality={quality} />}
      {stage.kind === 'accumulate' && <AccumulateStage quality={quality} />}
      {stage.kind === 'principalTrap' && <PrincipalTrapStage quality={quality} />}
      {stage.kind === 'shock' && <ShockStage active={stage.active} quality={quality} />}
      {stage.kind === 'overlap' && <OverlapStage a={stage.a} b={stage.b} quality={quality} />}
      {stage.kind === 'excavator' && <Excavator />}
      {stage.kind === 'excavator' && stage.meter && <FeeMeter />}
      {stage.kind === 'ticker' && <PriceTicker />}
    </>
  )
}
