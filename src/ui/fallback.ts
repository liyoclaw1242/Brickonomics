import type { Universe } from '../data/universe'
import { makeTextContext } from '../tour/context'
import { DEFAULT_VALUES, sandboxPatchFor } from '../tour/engine'
import type { LessonText, Level, RecapLine, TextContext } from '../tour/types'
import { stageReadout, type ReadoutRow } from './readout'
import type { Mark } from './marks'
import { T } from './strings'

/** line 保留 `**…**` 強調標記；more 是多說一點 */
export type FallbackStep = { id: string; title: string; line: string; more: string; mark?: Mark; rows: ReadoutRow[]; recap?: RecapLine[] }
export type FallbackLevel = { label: string; title: string; steps: FallbackStep[] }

const resolve = (t: LessonText, ctx: TextContext): string => (typeof t === 'function' ? t(ctx) : t)

/** 文字版課程：每一步的標題、一句話、多說一點，以及該步驟預設狀態下的即時數字 */
export function fallbackLevels(levels: readonly Level[], u: Universe): FallbackLevel[] {
  const ctx = makeTextContext(u)
  return levels.map((level, i) => ({
    label: T.levelLabel(i),
    title: level.title,
    steps: level.steps.map((step) => {
      const patch = sandboxPatchFor(step.scene)
      const values = { ...DEFAULT_VALUES, ...step.scene.values, slice: patch.slice ?? 0, explode: patch.explode ?? 0 }
      const productId = step.scene.product ?? null
      return {
        id: step.id,
        title: step.title,
        line: resolve(step.fallbackLine ?? step.line, ctx),
        more: resolve(step.fallbackMore ?? step.more, ctx),
        mark: step.mark,
        rows: stageReadout(step.scene.stage ?? { kind: 'none' }, values, u, productId),
        ...(step.recap ? { recap: step.recap } : {}),
      }
    }),
  }))
}
