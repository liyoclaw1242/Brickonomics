import { useCallback, useMemo, useState } from 'react'
import { universe } from '../data'
import { colorForKey } from '../scene/palette'
import { prefersReducedMotion, useRevealAfterCamera } from '../scene/useRevealAfterCamera'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied, lineOf, moreOf, nextPosition, titleOf } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { BigNumberCard } from './panel/BigNumberCard'
import { MoreSection } from './panel/MoreSection'
import { OneLine } from './panel/OneLine'
import { StepHeader } from './panel/StepHeader'
import { StepNav } from './panel/StepNav'
import { stageReadout } from './readout'
import { StageControls } from './StageControls'
import { T } from './strings'

const ctx = makeTextContext(universe)
const HINT_ID = 'tour-hint'
export function TourPanel() {
  const pos = useTour((s) => s.pos)
  const values = useTour((s) => s.values)
  const unlocked = useTour((s) => s.progress.sandboxUnlocked)
  const { next, prev, enterSandbox } = useTour.getState()
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const productId = useSandbox((s) => s.productId)
  const step = currentStep({ pos })
  const line = useMemo(() => lineOf(step, ctx), [step])
  const more = useMemo(() => moreOf(step, ctx), [step])
  const big = step.bigNumber?.(ctx, values)
  const ok = isSatisfied(step.until, { ...values, slice, explode })
  const rows = stageReadout(step.scene.stage ?? { kind: 'none' }, { ...values, slice, explode }, universe, productId)
  const isLast = nextPosition(LEVELS, pos) === null
  const [instant] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(step.id, instant)
  const colorOf = useCallback((key: string) => colorForKey(universe, key), [])

  return (
    <aside className="panel tour">
      <StepHeader level={pos.level} levelCount={LEVELS.length} title={titleOf(step)} mark={step.mark} revealed={revealed}>
        <OneLine line={line} colorOf={colorOf} />
      </StepHeader>
      {big && (
        <div className={revealed ? 'step-reveal is-revealed' : 'step-reveal'}>
          <BigNumberCard key={step.id} n={big} color={big.colorKey ? colorOf(big.colorKey) : undefined} run={revealed} instant={instant} />
        </div>
      )}
      {step.controls && <StageControls controls={step.controls} />}
      {!ok && (
        <p className="hint" id={HINT_ID}>
          {T.tryIt}
        </p>
      )}
      <StepNav onPrev={prev} onNext={next} canPrev={!(pos.level === 0 && pos.step === 0)} canNext={ok} isLast={isLast} hintId={HINT_ID} />
      <MoreSection key={step.id} more={more} rows={rows} />
      {unlocked && (
        <button className="link" onClick={enterSandbox}>
          {T.skipToSandbox}
        </button>
      )}
    </aside>
  )
}
