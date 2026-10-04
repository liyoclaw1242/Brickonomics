import { useCallback, useMemo, useState } from 'react'
import { universe } from '../data'
import { colorForKey } from '../scene/palette'
import { prefersReducedMotion, useRevealAfterCamera } from '../scene/useRevealAfterCamera'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, routeIds, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied, lineOf, moreOf, nextPosition, prevPosition, titleOf } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { BigNumberCard } from './panel/BigNumberCard'
import { bigNumberDelayMs } from '../scene/layout/lightning'
import { MoreSection } from './panel/MoreSection'
import { OneLine } from './panel/OneLine'
import { StepHeader } from './panel/StepHeader'
import { StepNav } from './panel/StepNav'
import { RouteStart } from './panel/RouteStart'
import { chapterStates } from './chapters'
import { stageReadout } from './readout'
import { stepMarks } from './marks'
import { StageControls } from './StageControls'
import { T } from './strings'
import type { Control } from '../tour/types'

/** 拉桿在面板上的名稱（和 StageControls 一致） */
const controlName = (c: Control): string => (c === 'slice' ? T.slice : c === 'explode' ? T.explode : T.controls[c])

const ctx = makeTextContext(universe)
const HINT_ID = 'tour-hint'

/** 導覽面板；第一次來（還沒選路線）先顯示開始卡片 */
export function TourPanel() {
  const route = useTour((s) => s.route)
  if (route === null) {
    return (
      <aside className="panel tour">
        <p className="brand">{T.brand}</p>
        <RouteStart onChoose={(r) => useTour.getState().chooseRoute(r)} />
      </aside>
    )
  }
  return <StepPanel />
}

function StepPanel() {
  const pos = useTour((s) => s.pos)
  const ids = routeIds(useTour((s) => s.route))
  const progress = useTour((s) => s.progress)
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
  const isLast = nextPosition(LEVELS, pos, ids) === null
  const canPrev = prevPosition(LEVELS, pos, ids) !== null
  // 章節編號只數路線裡有的章；簡單版的地底章只剩回顧，叫「完成」
  const chapters = chapterStates(LEVELS, pos, progress, ids)
  const here = chapters.find((c) => c.index === pos.level)
  const chapter = here?.finish ? T.finishChapter : T.chapters[pos.level]
  const [instant] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(step.id, instant)
  const colorOf = useCallback((key: string) => colorForKey(universe, key), [])
  const marks = useMemo(() => stepMarks(step, universe), [step])

  return (
    <aside className="panel tour">
      <StepHeader chapter={chapter} number={here?.number ?? pos.level} count={chapters.length} title={titleOf(step)} marks={marks} revealed={revealed}>
        <OneLine line={line} colorOf={colorOf} />
      </StepHeader>
      {big && (
        <div className={revealed ? 'step-reveal is-revealed' : 'step-reveal'}>
          <BigNumberCard key={step.id} n={big} color={big.colorKey ? colorOf(big.colorKey) : undefined} run={revealed} instant={instant} titleMarks={marks} delayMs={bigNumberDelayMs(step.scene.stage, instant)} />
        </div>
      )}
      {step.controls && <StageControls controls={step.controls} />}
      {!ok && step.until && (
        <p className="hint hint--try" id={HINT_ID}>
          {T.tryIt(controlName(step.until.control))}
        </p>
      )}
      {step.recap && (
        <ul className="recap" aria-label={T.recapLabel}>
          {step.recap.map((r) => (
            <li key={r.text}>
              <span className="recap__icon" aria-hidden="true">
                {r.icon}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}
      <StepNav onPrev={prev} onNext={next} canPrev={canPrev} canNext={ok} isLast={isLast} hintId={HINT_ID} />
      <MoreSection key={step.id} more={more} rows={rows} />
      {unlocked && (
        <button className="link" onClick={enterSandbox}>
          {T.skipToSandbox}
        </button>
      )}
    </aside>
  )
}
