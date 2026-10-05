import type { SandboxPatch } from '../store/sandbox'
import type { EventSpec } from '../scene/events/types'
import type { Condition, Control, CourseId, CoursePosition, Level, Position, Progress, SceneDirective, Step, TextContext, TourValues } from './types'
import { COURSES, courseOfStep, courseSteps } from './courses'
import { LEVELS } from './levels'

export { DEFAULT_VALUES } from './values'

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
  // 股票章在 r2 把舊 s-5、s-6、s-7 併成新 s-5、s-6：舊第 6 步（索引 5，除息）起往前一步
  if (pos && stepId === undefined && levels[pos.level]?.id === 'stock' && pos.step >= LEGACY_STOCK_MERGED_AT) pos = { level: pos.level, step: pos.step - 1 }
  if (pos && isValidPosition(levels, pos)) return pos
  const level = pos && Number.isInteger(pos.level) ? levels[pos.level] : undefined
  if (pos && level && level.steps.length > 0) return { level: pos.level, step: level.steps.length - 1 }
  return { level: 0, step: 0 }
}

/** 舊基金章第 7 步（索引 6，f-7）起，f-6、f-7 併成一步後都往前一步 */
const LEGACY_FUND_MERGED_AT = 6

/** 舊股票章第 6 步（索引 5）起往前一步 */
const LEGACY_STOCK_MERGED_AT = 5

export function stepAt(levels: readonly Level[], pos: Position): Step {
  const s = levels[pos.level]?.steps[pos.step]
  if (!s) throw new RangeError(`no step at ${pos.level}/${pos.step}`)
  return s
}

export function positionOf(levels: readonly Level[], stepId: string): Position {
  for (let level = 0; level < levels.length; level++) {
    const step = levels[level]!.steps.findIndex((s) => s.id === stepId)
    if (step >= 0) return { level, step }
  }
  throw new Error(`unknown step ${stepId}`)
}

export function isSatisfied(c: Condition | undefined, v: TourValues): boolean {
  return !c || v[c.control] >= c.min
}

/**
 * 這一步此刻的事件：有 scene.eventWhen 時只在條件成立時才有（拉桿還沒到 → undefined）。
 * 回傳的永遠是步驟資料裡同一個 spec（參數不跟著拉桿變），事件時鐘才不會因為拖拉桿而重播。
 */
export function activeEvent(step: Pick<Step, 'scene'>, v: TourValues): EventSpec | undefined {
  const e = step.scene.event
  if (!e) return undefined
  return isSatisfied(step.scene.eventWhen, v) ? e : undefined
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

// ───────────────────────── 課程（Plan 6）─────────────────────────

const COURSE_IDS: readonly CourseId[] = COURSES.map((c) => c.id)

export const isCourseId = (x: unknown): x is CourseId => typeof x === 'string' && (COURSE_IDS as readonly string[]).includes(x)

/** 已開放的課（網址、存檔、換階只能進這些） */
export const isAvailableCourse = (x: unknown): x is CourseId => isCourseId(x) && courseById(x).available

export function courseById(id: CourseId) {
  const c = COURSES.find((x) => x.id === id)
  if (!c) throw new RangeError(`no course ${id}`)
  return c
}

const STEPS_CACHE = new Map<CourseId, readonly Step[]>()

/** 課程的步驟（照課程順序；同一個陣列參考，selector 可放心用） */
export function stepsOf(course: CourseId): readonly Step[] {
  let s = STEPS_CACHE.get(course)
  if (!s) {
    s = courseSteps(courseById(course))
    STEPS_CACHE.set(course, s)
  }
  return s
}

export function isValidCoursePos(pos: CoursePosition): boolean {
  return isCourseId(pos.course) && Number.isInteger(pos.index) && pos.index >= 0 && pos.index < stepsOf(pos.course).length
}

export function stepAtCourse(pos: CoursePosition): Step {
  const s = isCourseId(pos.course) ? stepsOf(pos.course)[pos.index] : undefined
  if (!s) throw new RangeError(`no step at ${pos.course}/${pos.index}`)
  return s
}

/** 課內的下一步；課的最後一步之後是 null（不跨課） */
export function nextIndex(pos: CoursePosition): number | null {
  return pos.index + 1 < stepsOf(pos.course).length ? pos.index + 1 : null
}

/** 課內的上一步；第一步之前是 null */
export function prevIndex(pos: CoursePosition): number | null {
  return pos.index > 0 ? pos.index - 1 : null
}

/** 走過的比例＝課內排在這一步之前的步數 ÷ 課的總步數 */
export function progressFractionCourse(pos: CoursePosition): number {
  const n = stepsOf(pos.course).length
  return n === 0 ? 0 : pos.index / n
}

/** 這一步在課程的第幾章（章索引）；不存在時 -1 */
export function chapterOfIndex(course: CourseId, index: number): number {
  const chapters = courseById(course).chapters
  let start = 0
  for (let i = 0; i < chapters.length; i++) {
    const n = chapters[i]!.stepIds.length
    if (index >= start && index < start + n) return i
    start += n
  }
  return -1
}

/** 某一章的第一步（課內索引）；章不存在或是空的時 null */
export function firstIndexOfChapter(course: CourseId, chapter: number): number | null {
  const chapters = courseById(course).chapters
  if (!chapters[chapter] || chapters[chapter]!.stepIds.length === 0) return null
  return chapters.slice(0, chapter).reduce((n, ch) => n + ch.stepIds.length, 0)
}

/** 課內這個步驟 id 的索引；不在這門課時 -1 */
export function indexOfStep(course: CourseId, stepId: string): number {
  return stepsOf(course).findIndex((s) => s.id === stepId)
}

/** 照課程順序的下一門課；沒有下一門或還沒開放時 null（結尾步改推薦自由玩） */
export function nextCourse(course: CourseId): CourseId | null {
  const n = COURSES[COURSE_IDS.indexOf(course) + 1]
  return n && n.available ? n.id : null
}

/** 解析網址與舊存檔用：新課裡有這一步就停那步，否則新課第一步（換階選單改走各課上次停的位置，不用這個） */
export function switchTarget(to: CourseId, stepId: string | undefined): CoursePosition {
  const i = stepId === undefined ? -1 : indexOfStep(to, stepId)
  return { course: to, index: Math.max(0, i) }
}

// ───────────── 舊路線（簡單版／完整版）的遷移 ─────────────

/** 舊版路線：簡單版＝現在的初階 */
type LegacyRoute = 'simple' | 'full'
const isLegacyRoute = (x: unknown): x is LegacyRoute => x === 'simple' || x === 'full'

const LEVEL_ORDER: readonly string[] = LEVELS.flatMap((l) => l.steps.map((s) => s.id))

/** 初階裡「這一步或它之前」（照舊課程順序）最近的一步；前面都沒有就初階第一步 */
function snapToBeginner(stepId: string): CoursePosition {
  const at = LEVEL_ORDER.indexOf(stepId)
  const steps = stepsOf('beginner')
  let best = 0
  steps.forEach((s, i) => {
    const o = LEVEL_ORDER.indexOf(s.id)
    if (o >= 0 && o <= at) best = i
  })
  return { course: 'beginner', index: best }
}

/** 一個步驟 id 落在哪門課的哪一步；舊簡單版的步驟不在初階時，停在初階最近的前一步 */
function locate(stepId: string, route?: LegacyRoute): CoursePosition | null {
  const course = courseOfStep(stepId)
  if (route === 'simple' && course !== 'beginner') return LEVEL_ORDER.includes(stepId) ? snapToBeginner(stepId) : { course: 'beginner', index: 0 }
  if (!course || !isAvailableCourse(course)) return null
  return { course, index: indexOfStep(course, stepId) }
}

function legacyPos(x: unknown): Position | undefined {
  if (typeof x !== 'object' || x === null) return undefined
  const r = x as Record<string, unknown>
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
  return ok(r.level) && ok(r.step) ? { level: r.level, step: r.step } : undefined
}

/**
 * 存檔（新或舊格式）停在哪：
 * 新格式＝course＋stepId（stepId 不在那門課就從那門課第一步）；
 * 舊格式＝有 stepId 就找它所在的課，沒有就用 resumePosition 的舊遷移找回步驟再找課；
 * 舊簡單版（route: 'simple'）的步驟不在初階時，停在初階最近的前一步。
 * 沒選過課（第一次來）或無效時 null（顯示開場卡）。
 */
export function resumeCoursePosition(saved: unknown): CoursePosition | null {
  if (typeof saved !== 'object' || saved === null) return null
  const r = saved as Record<string, unknown>
  const stepId = typeof r.stepId === 'string' ? r.stepId : undefined
  if ('course' in r) {
    if (!isAvailableCourse(r.course)) return null
    return switchTarget(r.course, stepId)
  }
  const route = isLegacyRoute(r.route) ? r.route : undefined
  const pos = legacyPos(r.pos)
  // 選過路線卻沒有位置：簡單版 → 初階第一步，完整版 → 中階第一步（和網址 ?route= 的規則一致）
  if (stepId === undefined && pos === undefined) return route === 'simple' ? { course: 'beginner', index: 0 } : route === 'full' ? { course: 'intermediate', index: 0 } : null
  const known = stepId !== undefined && LEVEL_ORDER.includes(stepId)
  const old = resumePosition(LEVELS, pos, known ? stepId : undefined)
  return locate(LEVELS[old.level]!.steps[old.step]!.id, route)
}

const emptyCompleted = (): Record<CourseId, string[]> => ({ beginner: [], intermediate: [], advanced: [] })

export const emptyProgress = (): Progress => ({ course: null, completed: emptyCompleted(), finished: [], sandboxUnlocked: false })

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])

/** 舊存檔完成的章（LEVELS 章 id）→ 每門課完成的章：這章裡原本就在舊課程的步驟全在已完成的舊章裡 */
function migrateCompleted(oldChapters: readonly string[]): Record<CourseId, string[]> {
  const done = new Set(LEVELS.filter((l) => oldChapters.includes(l.id)).flatMap((l) => l.steps.map((s) => s.id)))
  const out = emptyCompleted()
  for (const c of COURSES) {
    for (const ch of c.chapters) {
      const old = ch.stepIds.filter((id) => LEVEL_ORDER.includes(id))
      if (old.length > 0 && old.every((id) => done.has(id))) out[c.id].push(ch.id)
    }
  }
  return out
}

/** 每門課最後停的步驟：只留可上的課、而且步驟真的在那門課裡的 */
function parseLastStep(x: unknown): Partial<Record<CourseId, string>> | undefined {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return undefined
  const out: Partial<Record<CourseId, string>> = {}
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (isAvailableCourse(k) && typeof v === 'string' && indexOfStep(k, v) >= 0) out[k] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** 換階時進哪一步：那門課還沒上完、而且記得停在哪 → 那一步；否則第一步 */
export function resumeInCourse(progress: Progress, course: CourseId): CoursePosition {
  const id = progress.finished.includes(course) ? undefined : progress.lastStep?.[course]
  return { course, index: Math.max(0, id === undefined ? 0 : indexOfStep(course, id)) }
}

/** 讀進度：新格式照讀；舊格式（completed 是章 id 陣列、pos、route）遷移成課程進度 */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress()
  let o: unknown
  try {
    o = JSON.parse(raw)
  } catch {
    return emptyProgress()
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return emptyProgress()
  const rec = o as Record<string, unknown>
  const sandboxUnlocked = rec.sandboxUnlocked === true
  const at = resumeCoursePosition(rec)
  const where = at ? { course: at.course, stepId: stepAtCourse(at).id } : { course: null }
  if (!('course' in rec)) {
    return { ...where, completed: migrateCompleted(strings(rec.completed)), finished: [], sandboxUnlocked }
  }
  const completed = emptyCompleted()
  const cr = typeof rec.completed === 'object' && rec.completed !== null && !Array.isArray(rec.completed) ? (rec.completed as Record<string, unknown>) : {}
  for (const id of COURSE_IDS) completed[id] = strings(cr[id])
  const finished = strings(rec.finished).filter(isAvailableCourse)
  const lastStep = parseLastStep(rec.lastStep)
  return { ...where, completed, finished, sandboxUnlocked: sandboxUnlocked || finished.length > 0, ...(lastStep ? { lastStep } : {}) }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p)
}

const SANDBOX_KEYS = ['product', 'slice', 'explode', 'axis']

export type CourseQuery = {
  mode?: 'tour' | 'sandbox'
  course?: CourseId
  stepId?: string
  /** 舊網址：?route=simple|full；?level=&step= 已換成 stepId */
  legacy?: { route?: LegacyRoute }
}

/**
 * ?course=<id>&step=<stepId>（新）；舊網址 ?route=simple|full、?level=1&step=2（絕對位置）照樣能開。
 * ?mode=sandbox 或帶沙盒參數（product/slice/explode/axis）＝沙盒模式。
 */
export function parseCourseQuery(search: string): CourseQuery {
  const q = new URLSearchParams(search)
  const out: CourseQuery = {}
  const r = q.get('route')
  if (isLegacyRoute(r)) out.legacy = { route: r }
  const c = q.get('course')
  if (isAvailableCourse(c)) out.course = c
  const step = q.get('step')
  if (q.has('level') && !out.course) {
    const pos = { level: Number(q.get('level')), step: Number(step ?? 0) }
    if (isValidPosition(LEVELS, pos)) out.stepId = stepAt(LEVELS, pos).id
  } else if (step !== null && courseOfStep(step) !== undefined) {
    out.stepId = step
  }
  if (q.get('mode') === 'sandbox' || SANDBOX_KEYS.some((k) => q.has(k))) out.mode = 'sandbox'
  else if (out.course || out.stepId) out.mode = 'tour'
  return out
}

/**
 * 網址指到哪一步：?course= 優先（step 不在那門課 → 那門課第一步）；
 * 只有步驟（舊 ?level=&step= 或 ?step=）→ 它所在的課（舊 ?route=simple 不在初階 → 初階最近的前一步）；
 * 只有 ?route=：simple → 初階第一步，full → 中階第一步。都沒有＝null。
 */
export function queryPosition(q: CourseQuery): CoursePosition | null {
  if (q.course) return switchTarget(q.course, q.stepId)
  const route = q.legacy?.route
  if (q.stepId !== undefined) return locate(q.stepId, route) ?? { course: 'intermediate', index: 0 }
  if (route === 'simple') return { course: 'beginner', index: 0 }
  if (route === 'full') return { course: 'intermediate', index: 0 }
  return null
}

/**
 * 開網頁時停在哪：網址優先，再來是存檔；都沒有＝第一次來（course null，背景照初階第一步）。
 * 直接進自由玩（?mode=sandbox，或存檔已解鎖自由玩）卻沒有課的：課設成初階，換階、時間軸、重看導覽才有東西可用。
 */
export function startOfCourse(progress: Progress, q: CourseQuery): { course: CourseId | null; pos: CoursePosition } {
  const fromQuery = queryPosition(q)
  if (fromQuery) return { course: fromQuery.course, pos: fromQuery }
  if (progress.course !== null && isAvailableCourse(progress.course)) return { course: progress.course, pos: switchTarget(progress.course, progress.stepId) }
  const sandbox = q.mode === 'sandbox' || progress.sandboxUnlocked
  return { course: sandbox ? 'beginner' : null, pos: { course: 'beginner', index: 0 } }
}
