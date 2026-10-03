import type { Universe } from '../data/universe'
import { makeTextContext } from '../tour/context'
import { DEFAULT_VALUES, sandboxPatchFor } from '../tour/engine'
import type { Level, TextContext } from '../tour/types'
import { stageReadout, type ReadoutRow } from './readout'
import { T } from './strings'

export type FallbackStep = { id: string; text: string; rows: ReadoutRow[] }
export type FallbackLevel = { label: string; title: string; steps: FallbackStep[] }

const resolve = (t: string | ((c: TextContext) => string), ctx: TextContext): string => (typeof t === 'function' ? t(ctx) : t)

/** 文字版課程：每一步的課文與該步驟預設狀態下的即時數字 */
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
        text: resolve(step.fallbackText ?? step.text, ctx),
        rows: stageReadout(step.scene.stage ?? { kind: 'none' }, values, u, productId),
      }
    }),
  }))
}
