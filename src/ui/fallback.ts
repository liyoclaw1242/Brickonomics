import type { Universe } from '../data/universe'
import { makeTextContext } from '../tour/context'
import { activeEvent, DEFAULT_VALUES, sandboxPatchFor } from '../tour/engine'
import { courseSteps } from '../tour/courses'
import type { CheckupLine, Course, LessonText, RecapLine, ResearchCard, Step, TextContext } from '../tour/types'
import { stageReadout, type ReadoutRow } from './readout'
import { stepMarks, type Mark } from './marks'
import { T } from './strings'

/** line 保留 `**…**` 強調標記；more 是多說一點 */
export type FallbackStep = { id: string; title: string; line: string; more: string; marks: Mark[]; rows: ReadoutRow[]; recap?: RecapLine[]; checkupCard?: CheckupLine[]; compare?: boolean; research?: ResearchCard }
export type FallbackLevel = { label: string; steps: FallbackStep[] }

const resolve = (t: LessonText, ctx: TextContext): string => (typeof t === 'function' ? t(ctx) : t)

/**
 * 文字版課程：一門課照章節列出每一步的標題、一句話、多說一點，以及該步驟預設狀態下的即時數字。
 * 章的標籤＝「編號 章名」（和時間軸一致，例如「00 序章」「05 完成」）。
 */
export function fallbackCourse(course: Course, u: Universe): FallbackLevel[] {
  const ctx = makeTextContext(u)
  const steps = new Map(courseSteps(course).map((s) => [s.id, s] as const))
  return course.chapters.map((ch, i) => ({
    label: T.chapterName(i, ch.name),
    steps: ch.stepIds.map((id) => fallbackStep(steps.get(id)!, ctx, u)),
  }))
}

function fallbackStep(step: Step, ctx: TextContext, u: Universe): FallbackStep {
  const patch = sandboxPatchFor(step.scene)
  // 文字版不能拖：有門檻的步驟用「做完那個動作」之後的值（例如 s-5 拉到發金幣那一刻）
  const values = { ...DEFAULT_VALUES, ...step.scene.values, slice: patch.slice ?? 0, explode: patch.explode ?? 0 }
  if (step.until) values[step.until.control] = step.until.min
  const productId = step.scene.product ?? null
  return {
    id: step.id,
    title: step.title,
    line: resolve(step.fallbackLine ?? step.line, ctx),
    more: resolve(step.fallbackMore ?? step.more, ctx),
    marks: stepMarks(step, u),
    rows: stageReadout(step.scene.stage ?? { kind: 'none' }, values, u, productId, activeEvent(step, values)),
    ...(step.recap ? { recap: step.recap } : {}),
    ...(step.checkupCard ? { checkupCard: step.checkupCard(ctx) } : {}),
    ...(step.compare ? { compare: true } : {}),
    ...(step.research ? { research: step.research(ctx) } : {}),
  }
}
