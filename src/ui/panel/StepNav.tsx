import { T } from '../strings'

/** 上一步／下一步；下一步不可按時用 aria-describedby 指向嘗試提示 */
export function StepNav({ onPrev, onNext, canPrev, canNext, isLast, hintId }: {
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
  isLast: boolean
  hintId: string
}) {
  return (
    <div className="step-nav">
      <button onClick={onPrev} disabled={!canPrev}>
        {T.prev}
      </button>
      <button className="primary" onClick={onNext} disabled={!canNext} aria-describedby={canNext ? undefined : hintId}>
        {isLast ? T.finish : T.next}
      </button>
    </div>
  )
}
