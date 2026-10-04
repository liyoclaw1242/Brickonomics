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
import { ON_PLAZA } from './plaza'
import { PriceTicker } from './PriceTicker'
import { OverlapStage } from './OverlapStage'
import { PrincipalTrapStage } from './PrincipalTrapStage'
import { ShockStage } from './ShockStage'
import { UndergroundStage } from './UndergroundStage'

const NONE: Stage = { kind: 'none' }

/** 依目前步驟顯示教學視覺；沙盒模式不顯示 */
export function StageView({ quality }: { quality: Quality }) {
  const stage = useTour((s) => (s.mode === 'tour' ? (currentStep(s).scene.stage ?? NONE) : NONE))
  return (
    <>
      {ON_PLAZA.has(stage.kind) && <Plaza />}
      {stage.kind === 'held' && <HeldBlocks items={stage.items} />}
      {stage.kind === 'bonds' && <BondShowcase stressed={stage.stressed} ranks={stage.ranks} quality={quality} />}
      {stage.kind === 'exdiv' && <ExDividendStage outcome={stage.outcome} quality={quality} />}
      {stage.kind === 'feeRace' && <FeeRaceStage etf={stage.etf} quality={quality} />}
      {stage.kind === 'accumulate' && <AccumulateStage quality={quality} />}
      {stage.kind === 'principalTrap' && <PrincipalTrapStage quality={quality} />}
      {stage.kind === 'shock' && <ShockStage active={stage.active} quality={quality} />}
      {stage.kind === 'overlap' && <OverlapStage a={stage.a} b={stage.b} quality={quality} />}
      {stage.kind === 'underground' && <UndergroundStage show={stage.show} cores={stage.cores} quality={quality} />}
      {stage.kind === 'excavator' && <Excavator />}
      {stage.kind === 'excavator' && stage.meter && <FeeMeter />}
      {stage.kind === 'ticker' && <PriceTicker />}
    </>
  )
}
