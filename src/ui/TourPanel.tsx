import { useCallback, useMemo, useState } from 'react'
import { universe } from '../data'
import { colorForKey } from '../scene/palette'
import { prefersReducedMotion, useRevealAfterCamera } from '../scene/useRevealAfterCamera'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { chapterOfIndex, courseById, isSatisfied, lineOf, moreOf, nextCourse, nextIndex, prevIndex, titleOf } from '../tour/engine'
import { BigNumberCard } from './panel/BigNumberCard'
import { bigNumberDelayMs } from '../scene/layout/lightning'
import { MoreSection } from './panel/MoreSection'
import { OneLine } from './panel/OneLine'
import { StepHeader } from './panel/StepHeader'
import { StepNav } from './panel/StepNav'
import { CourseStart } from './panel/CourseStart'
import { stageReadout } from './readout'
import { stepMarks } from './marks'
import { StageControls } from './StageControls'
import { T } from './strings'
import type { Control } from '../tour/types'

/** 拉桿在面板上的名稱（和 StageControls 一致） */
const controlName = (c: Control): string => (c === 'slice' ? T.slice : c === 'explode' ? T.explode : T.controls[c])

const ctx = makeTextContext(universe)
const HINT_ID = 'tour-hint'

/** 導覽面板；第一次來（還沒選課）先顯示開場卡 */
export function TourPanel() {
  const course = useTour((s) => s.course)
  if (course === null) {
    return (
      <aside className="panel tour">
        <p className="brand">{T.brand}</p>
        <CourseStart onChoose={(id) => useTour.getState().chooseCourse(id)} />
      </aside>
    )
  }
  return <StepPanel />
}

function StepPanel() {
  const pos = useTour((s) => s.pos)
  const values = useTour((s) => s.values)
  const unlocked = useTour((s) => s.progress.sandboxUnlocked)
  const { next, prev, enterSandbox, goNextCourse } = useTour.getState()
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const productId = useSandbox((s) => s.productId)
  const step = currentStep({ pos })
  const line = useMemo(() => lineOf(step, ctx), [step])
  const more = useMemo(() => moreOf(step, ctx), [step])
  const big = step.bigNumber?.(ctx, values)
  const ok = isSatisfied(step.until, { ...values, slice, explode })
  const rows = stageReadout(step.scene.stage ?? { kind: 'none' }, { ...values, slice, explode }, universe, productId)
  const isLast = nextIndex(pos) === null
  const canPrev = prevIndex(pos) !== null
  // 章節編號以目前課程的章為單位
  const chapters = courseById(pos.course).chapters
  const here = chapterOfIndex(pos.course, pos.index)
  const chapter = chapters[here]
  // 結尾步：口訣卡下面推薦下一階（照課程順序；下一階還沒開放就不顯示）
  const upNext = isLast ? nextCourse(pos.course) : null
  const [instant] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(step.id, instant)
  const colorOf = useCallback((key: string) => colorForKey(universe, key), [])
  const marks = useMemo(() => stepMarks(step, universe), [step])

  return (
    <aside className="panel tour">
      <StepHeader chapter={chapter} number={here} count={chapters.length} title={titleOf(step)} marks={marks} revealed={revealed}>
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
      {/* 有下一階才推薦；最後一門課的結尾步只留「自由玩」（下一步按鈕） */}
      {upNext && (
        <button className="next-tier" onClick={() => ok && goNextCourse()} disabled={!ok}>
          {T.course.nextTier(courseById(upNext).name)}
        </button>
      )}
      <StepNav onPrev={prev} onNext={next} canPrev={canPrev} canNext={ok} isLast={isLast} hintId={HINT_ID} />
      <MoreSection key={step.id} more={more} rows={rows} />
      {/* 結尾步本來就是去自由玩，不再另外放「跳過導覽」 */}
      {unlocked && !isLast && (
        <button className="link" onClick={enterSandbox}>
          {T.skipToSandbox}
        </button>
      )}
    </aside>
  )
}
