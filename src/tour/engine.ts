import type { SandboxPatch } from '../store/sandbox'
import type { Condition, Control, Level, Position, Progress, SceneDirective, StageValues, Step, TextContext, TourValues } from './types'

export const DEFAULT_VALUES: StageValues = { years: 1, periods: 0, phase: 0, frontLoad: 0.015 }

/** 拉桿的預設範圍；步驟可用 step.ranges 縮小 */
export const DEFAULT_RANGES: Record<Control, [number, number]> = {
  years: [0, 10],
  periods: [0, 20],
  phase: [0, 1],
  frontLoad: [0, 0.03],
  slice: [0, 1],
  explode: [0, 1],
}

export function controlRange(step: Pick<Step, 'ranges'>, c: Control): [number, number] {
  return step.ranges?.[c] ?? DEFAULT_RANGES[c]
}

export function isValidPosition(levels: readonly Level[], pos: Position): boolean {
  return Number.isInteger(pos.level) && Number.isInteger(pos.step) && !!levels[pos.level]?.steps[pos.step]
}

/**
 * 存檔的位置在課程改版後可能不對了。優先用存的步驟 id 找回；
 * 舊存檔沒有 id 時，基金章在 r3 把 f-6、f-7 併成一步，所以舊的第 7 步起要往前一步；
 * 位置還是不存在就停在同一章最後一步，整章不見或沒有存檔就從頭開始。
 */
export function resumePosition(levels: readonly Level[], pos: Position | undefined, stepId?: string): Position {
  if (stepId !== undefined) {
    for (let level = 0; level < levels.length; level++) {
      const step = levels[level]!.steps.findIndex((s) => s.id === stepId)
      if (step >= 0) return { level, step }
    }
  }
  if (pos && stepId === undefined && levels[pos.level]?.id === 'fund' && pos.step >= LEGACY_FUND_MERGED_AT) pos = { level: pos.level, step: pos.step - 1 }
  if (pos && isValidPosition(levels, pos)) return pos
  const level = pos && Number.isInteger(pos.level) ? levels[pos.level] : undefined
  if (pos && level && level.steps.length > 0) return { level: pos.level, step: level.steps.length - 1 }
  return { level: 0, step: 0 }
}

/** 舊基金章第 7 步（索引 6，f-7）起，f-6、f-7 併成一步後都往前一步 */
const LEGACY_FUND_MERGED_AT = 6

export function stepAt(levels: readonly Level[], pos: Position): Step {
  const s = levels[pos.level]?.steps[pos.step]
  if (!s) throw new RangeError(`no step at ${pos.level}/${pos.step}`)
  return s
}

export function nextPosition(levels: readonly Level[], pos: Position): Position | null {
  const level = levels[pos.level]
  if (level && pos.step + 1 < level.steps.length) return { level: pos.level, step: pos.step + 1 }
  if (pos.level + 1 < levels.length) return { level: pos.level + 1, step: 0 }
  return null
}

export function prevPosition(levels: readonly Level[], pos: Position): Position | null {
  if (pos.step > 0) return { level: pos.level, step: pos.step - 1 }
  const prev = levels[pos.level - 1]
  return prev ? { level: pos.level - 1, step: prev.steps.length - 1 } : null
}

export function positionOf(levels: readonly Level[], stepId: string): Position {
  for (let level = 0; level < levels.length; level++) {
    const step = levels[level]!.steps.findIndex((s) => s.id === stepId)
    if (step >= 0) return { level, step }
  }
  throw new Error(`unknown step ${stepId}`)
}

export function progressFraction(levels: readonly Level[], pos: Position): number {
  const total = levels.reduce((n, l) => n + l.steps.length, 0)
  const before = levels.slice(0, pos.level).reduce((n, l) => n + l.steps.length, 0) + pos.step
  return total === 0 ? 0 : before / total
}

export function isSatisfied(c: Condition | undefined, v: TourValues): boolean {
  return !c || v[c.control] >= c.min
}

export function sandboxPatchFor(d: SceneDirective): SandboxPatch {
  const patch: SandboxPatch = {
    sliceAxis: d.sliceAxis ?? 'x',
    slice: d.slice ?? 0,
    explode: d.explode ?? 0,
    picked: d.picked ?? null,
  }
  if (d.product !== undefined) patch.productId = d.product
  return patch
}

const resolveText = (t: Step['line'], ctx: TextContext): string => (typeof t === 'function' ? t(ctx) : t)

export function titleOf(step: Step): string {
  return step.title
}

export function lineOf(step: Step, ctx: TextContext): string {
  return resolveText(step.line, ctx)
}

export function moreOf(step: Step, ctx: TextContext): string {
  return resolveText(step.more, ctx)
}

const EMPTY_PROGRESS: Progress = { completed: [], sandboxUnlocked: false }

export function parseProgress(raw: string | null): Progress {
  if (!raw) return { ...EMPTY_PROGRESS }
  try {
    const o: unknown = JSON.parse(raw)
    if (typeof o !== 'object' || o === null) return { ...EMPTY_PROGRESS }
    const rec = o as Record<string, unknown>
    const completed = Array.isArray(rec.completed) ? rec.completed.filter((x): x is string => typeof x === 'string') : []
    const p: Progress = { completed, sandboxUnlocked: rec.sandboxUnlocked === true }
    const pos = rec.pos
    if (typeof pos === 'object' && pos !== null) {
      const posRec = pos as Record<string, unknown>
      if (typeof posRec.level === 'number' && typeof posRec.step === 'number' && Number.isInteger(posRec.level) && posRec.level >= 0 && Number.isInteger(posRec.step) && posRec.step >= 0) {
        p.pos = { level: posRec.level, step: posRec.step }
      }
    }
    if (typeof rec.stepId === 'string') p.stepId = rec.stepId
    return p
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p)
}

const SANDBOX_KEYS = ['product', 'slice', 'explode', 'axis']

/** ?mode=sandbox、?level=1&step=2；帶沙盒參數（product/slice/explode/axis）視為沙盒模式 */
export function parseTourQuery(search: string, levels: readonly Level[]): { mode?: 'tour' | 'sandbox'; pos?: Position } {
  const q = new URLSearchParams(search)
  if (q.get('mode') === 'sandbox' || SANDBOX_KEYS.some((k) => q.has(k))) return { mode: 'sandbox' }
  if (q.has('level')) {
    const pos = { level: Number(q.get('level')), step: Number(q.get('step') ?? 0) }
    if (isValidPosition(levels, pos)) return { mode: 'tour', pos }
  }
  return {}
}
