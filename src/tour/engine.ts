import type { SandboxPatch } from '../store/sandbox'
import type { Condition, Control, Level, Position, Progress, Route, RouteIds, SceneDirective, StageValues, Step, TextContext, TourValues } from './types'

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

/** 這一步在路線裡嗎；ids 為 null（完整版）時每一步都在 */
export function inRoute(levels: readonly Level[], pos: Position, ids?: RouteIds): boolean {
  const s = levels[pos.level]?.steps[pos.step]
  return !!s && (!ids || ids.includes(s.id))
}

/** 不看路線的下一個位置 */
function rawNext(levels: readonly Level[], pos: Position): Position | null {
  const level = levels[pos.level]
  if (level && pos.step + 1 < level.steps.length) return { level: pos.level, step: pos.step + 1 }
  for (let l = pos.level + 1; l < levels.length; l++) if (levels[l]!.steps.length > 0) return { level: l, step: 0 }
  return null
}

/** 不看路線的上一個位置 */
function rawPrev(levels: readonly Level[], pos: Position): Position | null {
  if (pos.step > 0) return { level: pos.level, step: pos.step - 1 }
  for (let l = pos.level - 1; l >= 0; l--) {
    const n = levels[l]!.steps.length
    if (n > 0) return { level: l, step: n - 1 }
  }
  return null
}

/** 下一步；只走路線裡的步驟（ids 為 null／未填＝全部） */
export function nextPosition(levels: readonly Level[], pos: Position, ids?: RouteIds): Position | null {
  let p = rawNext(levels, pos)
  while (p && !inRoute(levels, p, ids)) p = rawNext(levels, p)
  return p
}

export function prevPosition(levels: readonly Level[], pos: Position, ids?: RouteIds): Position | null {
  let p = rawPrev(levels, pos)
  while (p && !inRoute(levels, p, ids)) p = rawPrev(levels, p)
  return p
}

/** 路線的第一步 */
export function firstPosition(levels: readonly Level[], ids?: RouteIds): Position {
  const start = { level: 0, step: 0 }
  return inRoute(levels, start, ids) ? start : (nextPosition(levels, start, ids) ?? start)
}

/** 某一章在路線裡的第一步；這章沒有路線步驟時 null */
export function firstInLevel(levels: readonly Level[], level: number, ids?: RouteIds): Position | null {
  const i = levels[level]?.steps.findIndex((s) => !ids || ids.includes(s.id)) ?? -1
  return i >= 0 ? { level, step: i } : null
}

/** 換路線（或存檔、網址的位置不在路線裡）：停在路線裡「這一步或它之前」最近的一步；前面都沒有就從路線第一步開始 */
export function snapToRoute(levels: readonly Level[], pos: Position, ids?: RouteIds): Position {
  if (inRoute(levels, pos, ids)) return pos
  return prevPosition(levels, pos, ids) ?? firstPosition(levels, ids)
}

export function positionOf(levels: readonly Level[], stepId: string): Position {
  for (let level = 0; level < levels.length; level++) {
    const step = levels[level]!.steps.findIndex((s) => s.id === stepId)
    if (step >= 0) return { level, step }
  }
  throw new Error(`unknown step ${stepId}`)
}

/** 走過的比例＝路線裡排在這一步之前的步數 ÷ 路線總步數 */
export function progressFraction(levels: readonly Level[], pos: Position, ids?: RouteIds): number {
  const all = levels.flatMap((l, level) => l.steps.map((s, step) => ({ id: s.id, level, step })))
  const route = all.filter((x) => !ids || ids.includes(x.id))
  const before = route.filter((x) => x.level < pos.level || (x.level === pos.level && x.step < pos.step)).length
  return route.length === 0 ? 0 : before / route.length
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
    if (isRoute(rec.route)) p.route = rec.route
    return p
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p)
}

const isRoute = (x: unknown): x is Route => x === 'simple' || x === 'full'

const SANDBOX_KEYS = ['product', 'slice', 'explode', 'axis']

export type TourQuery = { mode?: 'tour' | 'sandbox'; pos?: Position; route?: Route }

/** ?mode=sandbox、?level=1&step=2（絕對位置，不管路線）、?route=simple|full；帶沙盒參數（product/slice/explode/axis）視為沙盒模式 */
export function parseTourQuery(search: string, levels: readonly Level[]): TourQuery {
  const q = new URLSearchParams(search)
  const r = q.get('route')
  const route = isRoute(r) ? { route: r } : {}
  if (q.get('mode') === 'sandbox' || SANDBOX_KEYS.some((k) => q.has(k))) return { mode: 'sandbox', ...route }
  if (q.has('level')) {
    const pos = { level: Number(q.get('level')), step: Number(q.get('step') ?? 0) }
    if (isValidPosition(levels, pos)) return { mode: 'tour', pos, ...route }
  }
  return route
}

/**
 * 一開始用哪條路線：網址指定的優先，再來是存檔選過的；
 * 舊存檔（有位置、完成過章節或解鎖過自由玩）或直接連到某一步的網址＝完整版；
 * 都沒有＝第一次來，回傳 null（面板先問要走哪一條）。
 */
export function initialRoute(progress: Progress, query: TourQuery): Route | null {
  if (query.route) return query.route
  if (progress.route) return progress.route
  const returning = progress.pos !== undefined || progress.stepId !== undefined || progress.completed.length > 0 || progress.sandboxUnlocked
  return returning || query.pos || query.mode === 'sandbox' ? 'full' : null
}
