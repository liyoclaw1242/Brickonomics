import type { Universe } from '../data/universe'
import { makeTextContext } from '../tour/context'
import { DEFAULT_VALUES, sandboxPatchFor } from '../tour/engine'
import type { LessonText, Level, RecapLine, RouteIds, TextContext } from '../tour/types'
import { stageReadout, type ReadoutRow } from './readout'
import { stepMarks, type Mark } from './marks'
import { T } from './strings'

/** line 保留 `**…**` 強調標記；more 是多說一點 */
export type FallbackStep = { id: string; title: string; line: string; more: string; marks: Mark[]; rows: ReadoutRow[]; recap?: RecapLine[] }
export type FallbackLevel = { label: string; title: string; steps: FallbackStep[] }

const resolve = (t: LessonText, ctx: TextContext): string => (typeof t === 'function' ? t(ctx) : t)

/**
 * 文字版課程：每一步的標題、一句話、多說一點，以及該步驟預設狀態下的即時數字。
 * ids＝路線（null／未填＝全部）：只留路線裡的步驟與有步驟的章；只剩回顧的章（簡單版的地底）叫「完成」、不寫章名。
 */
export function fallbackLevels(levels: readonly Level[], u: Universe, ids?: RouteIds): FallbackLevel[] {
  const ctx = makeTextContext(u)
  return levels.flatMap((level, i) => {
    const kept = level.steps.filter((s) => !ids || ids.includes(s.id))
    if (kept.length === 0) return []
    const finish = kept.length < level.steps.length && kept.every((s) => s.recap !== undefined)
    return [
      {
        label: finish ? T.finishChapter.name : T.levelLabel(i),
        title: finish ? '' : level.title,
        steps: kept.map((step) => {
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
            rows: stageReadout(step.scene.stage ?? { kind: 'none' }, values, u, productId),
            ...(step.recap ? { recap: step.recap } : {}),
          }
        }),
      },
    ]
  })
}
