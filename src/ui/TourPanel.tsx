import { useMemo } from 'react'
import { universe } from '../data'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied, nextPosition, progressFraction, textOf } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { stageReadout } from './readout'
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
  const productId = useSandbox((s) => s.productId)
  const step = currentStep({ pos })
  const level = LEVELS[pos.level]!
  const text = useMemo(() => textOf(step, ctx), [step])
  const ok = isSatisfied(step.until, { ...values, slice, explode })
  const rows = stageReadout(step.scene.stage ?? { kind: 'none' }, { ...values, slice, explode }, universe, productId)
  const isLast = nextPosition(LEVELS, pos) === null

  return (
    <aside className="panel tour" aria-live="polite">
      <p className="tour__level">
        {T.levelLabel(pos.level)}・{level.title}
      </p>
      <progress className="tour__progress" value={progressFraction(LEVELS, pos)} max={1} />
      <p className="tour__text">{text}</p>
      {rows.length > 0 && (
        <table className="readout">
          <caption>{T.readout.title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">
                  {r.label}
                  {r.unverified && <span className="badge">{T.unverified}</span>}
                  {r.note && <small className="readout__note">{r.note}</small>}
                </th>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
