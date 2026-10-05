import { currentStep, useTour } from '../../store/tour'
import { effectiveExplode, useSandbox } from '../../store/sandbox'
import { activeEvent } from '../../tour/engine'
import type { Stage } from '../../tour/types'
import { EventLayer } from '../events/EventLayer'
import type { Quality } from '../quality'
import { useEventClock } from '../useEventClock'
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

/** 依目前步驟顯示教學視覺與事件（scene.event）；沙盒模式不顯示。事件時鐘只有一個，事件元件與舞台共用 */
export function StageView({ quality }: { quality: Quality }) {
  const stage = useTour((s) => (s.mode === 'tour' ? (currentStep(s).scene.stage ?? NONE) : NONE))
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  // scene.eventWhen：拉桿到了才有事件（同一個 spec，參數不跟著拉桿變）
  const event = useTour((s) => (s.mode === 'tour' ? activeEvent(currentStep(s), { ...s.values, slice, explode }) : undefined))
  const clock = useEventClock(event)
  return (
    <>
      {ON_PLAZA.has(stage.kind) && <Plaza />}
      {stage.kind === 'held' && <HeldBlocks items={stage.items} />}
      {stage.kind === 'bonds' && <BondShowcase ranks={stage.ranks} quality={quality} event={clock} />}
      {stage.kind === 'exdiv' && <ExDividendStage outcome={stage.outcome} quality={quality} />}
      {stage.kind === 'feeRace' && <FeeRaceStage etf={stage.etf} quality={quality} />}
      {stage.kind === 'accumulate' && <AccumulateStage quality={quality} />}
      {stage.kind === 'principalTrap' && <PrincipalTrapStage quality={quality} />}
      {stage.kind === 'shock' && <ShockStage quality={quality} event={clock} />}
      {stage.kind === 'overlap' && <OverlapStage a={stage.a} b={stage.b} quality={quality} />}
      {stage.kind === 'underground' && <UndergroundStage show={stage.show} cores={stage.cores} quality={quality} />}
      {stage.kind === 'excavator' && <Excavator other={stage.other} />}
      {stage.kind === 'excavator' && stage.meter && <FeeMeter />}
      {stage.kind === 'ticker' && <PriceTicker />}
      <EventLayer clock={clock} quality={quality} />
    </>
  )
}
