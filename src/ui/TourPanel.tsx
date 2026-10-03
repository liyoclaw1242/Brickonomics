import { useMemo } from 'react'
import { universe } from '../data'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied, nextPosition, progressFraction, textOf } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { StageControls } from './StageControls'
import { T } from './strings'

const ctx = makeTextContext(universe)

export function TourPanel() {
  const pos = useTour((s) => s.pos)
  const values = useTour((s) => s.values)
  const unlocked = useTour((s) => s.progress.sandboxUnlocked)
  const { next, prev, enterSandbox } = useTour.getState()
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const step = currentStep({ pos })
  const level = LEVELS[pos.level]!
  const text = useMemo(() => textOf(step, ctx), [step])
  const ok = isSatisfied(step.until, { ...values, slice, explode })
  const isLast = nextPosition(LEVELS, pos) === null

  return (
    <aside className="panel tour" aria-live="polite">
      <p className="tour__level">
        {T.levelLabel(pos.level)}・{level.title}
      </p>
      <progress className="tour__progress" value={progressFraction(LEVELS, pos)} max={1} />
      <p className="tour__text">{text}</p>
      {step.controls && <StageControls controls={step.controls} />}
      {!ok && <p className="hint">{T.tryIt}</p>}
      <div className="tour__nav">
        <button onClick={prev} disabled={pos.level === 0 && pos.step === 0}>
          {T.prev}
        </button>
        <button className="primary" onClick={next} disabled={!ok}>
          {isLast ? T.finish : T.next}
        </button>
      </div>
      {unlocked && (
        <button className="link" onClick={enterSandbox}>
          {T.skipToSandbox}
        </button>
      )}
    </aside>
  )
}
