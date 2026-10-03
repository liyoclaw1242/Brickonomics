import { currentStep, useTour } from '../../store/tour'
import type { Stage } from '../../tour/types'
import type { Quality } from '../quality'
import { BondShowcase } from './BondShowcase'
import { ExDividendStage } from './ExDividendStage'
import { HeldBlocks } from './HeldBlocks'
import { Plaza } from './Plaza'

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
    </>
  )
}
