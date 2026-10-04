import { nextButton } from '../model'
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
  const nb = nextButton(canNext, isLast)
  return (
    <div className="step-nav">
      <button onClick={onPrev} disabled={!canPrev}>
        {T.prev}
      </button>
      {/* 用 aria-disabled 而不是 disabled：剛到需要操作的步驟時，按鈕保留焦點並報讀為不可用 */}
      {/* 等拉桿時按鈕上的字直接說要做什麼（灰色），做完變回「下一步」 */}
      <button
        className={nb.waiting ? 'primary is-waiting' : 'primary'}
        onClick={() => canNext && onNext()}
        aria-disabled={!canNext}
        aria-label={nb.name === nb.text ? undefined : nb.name}
        aria-describedby={canNext ? undefined : hintId}
      >
        {nb.text}
      </button>
    </div>
  )
}
