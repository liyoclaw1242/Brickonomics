import type { SandboxPatch } from '../store/sandbox'
import type { Condition, Level, Position, Progress, SceneDirective, StageValues, Step, TextContext, TourValues } from './types'

export const DEFAULT_VALUES: StageValues = { years: 1, periods: 0, phase: 0, frontLoad: 0.015 }

export function isValidPosition(levels: readonly Level[], pos: Position): boolean {
  return Number.isInteger(pos.level) && Number.isInteger(pos.step) && !!levels[pos.level]?.steps[pos.step]
}

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

export function textOf(step: Step, ctx: TextContext): string {
  return typeof step.text === 'function' ? step.text(ctx) : step.text
}

const EMPTY_PROGRESS: Progress = { completed: [], sandboxUnlocked: false }

export function parseProgress(raw: string | null): Progress {
  if (!raw) return { ...EMPTY_PROGRESS }
  try {
    const o: unknown = JSON.parse(raw)
    if (typeof o !== 'object' || o === null) return { ...EMPTY_PROGRESS }
    const rec = o as Record<string, unknown>
    const completed = Array.isArray(rec.completed) ? rec.completed.filter((x): x is string => typeof x === 'string') : []
    return { completed, sandboxUnlocked: rec.sandboxUnlocked === true }
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
