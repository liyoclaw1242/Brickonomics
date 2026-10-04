import { useCallback, useEffect, useMemo, useState } from 'react'
import { universe } from '../data'
import { colorForKey } from '../scene/palette'
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
/** 鏡頭一直沒停下（例如被擋住）也要在這之後顯示文字，避免卡住 */
const REVEAL_FALLBACK_MS = 1500

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 3b1b「先看再命名」：換步驟後等鏡頭停下（body data-camera-settled / data-camera-seq）才顯示文字。
 * 鏡頭的啟動可能比這個 effect 早或晚，所以先確認看到「這次」的移動（settled=false 或 seq 改變），再等它變回 true。
 */
function useRevealAfterCamera(stepId: string, instant: boolean): boolean {
  const [revealed, setRevealed] = useState<{ id: string; on: boolean }>({ id: stepId, on: instant })
  useEffect(() => {
    if (instant) {
      setRevealed({ id: stepId, on: true })
      return
    }
    setRevealed({ id: stepId, on: false })
    const body = document.body
    const seq0 = body.dataset.cameraSeq
    let started = body.dataset.cameraSettled === 'false'
    const show = () => setRevealed({ id: stepId, on: true })
    const check = () => {
      if (body.dataset.cameraSettled === 'false' || body.dataset.cameraSeq !== seq0) started = true
      if (started && body.dataset.cameraSettled === 'true') show()
    }
    const mo = new MutationObserver(check)
    mo.observe(body, { attributes: true, attributeFilter: ['data-camera-settled', 'data-camera-seq'] })
    const timer = window.setTimeout(show, REVEAL_FALLBACK_MS)
    return () => {
      mo.disconnect()
      window.clearTimeout(timer)
    }
  }, [stepId, instant])
  // 換步驟的第一次 render（effect 尚未執行）也要立刻藏起來
  return revealed.id === stepId && revealed.on
}

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
