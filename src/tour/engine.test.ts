import { describe, it, expect } from 'vitest'
import type { Level } from './types'
import { LEVELS as REAL } from './levels'
import { COURSES, courseSteps } from './courses'
import {
  DEFAULT_VALUES, stepAt, isValidPosition, positionOf,
  isSatisfied, sandboxPatchFor, lineOf, moreOf, titleOf, parseProgress, serializeProgress, controlRange, resumePosition,
  stepAtCourse, nextIndex, prevIndex, progressFractionCourse, chapterOfIndex, firstIndexOfChapter, isValidCoursePos,
  resumeCoursePosition, parseCourseQuery, queryPosition, startOfCourse, emptyProgress, nextCourse, switchTarget, indexOfStep, stepsOf,
} from './engine'

const L: Level[] = [
  {
    id: 'a',
    title: 'A',
    steps: [
      { id: 'a1', title: 'T1', line: 'x', more: 'mx', scene: { camera: 'overview' } },
      { id: 'a2', title: 'T2', line: 'y', more: 'my', scene: { camera: 'tw' } },
    ],
  },
  {
    id: 'b',
    title: 'B',
    steps: [
      {
        id: 'b1',
        title: 'T3',
        line: (c) => `w=${c.weightPct('P', 'H')}`,
        more: (c) => `er=${c.expenseRatio('P')}`,
        scene: { camera: 'us', product: 'QQQ', explode: 1 },
      },
    ],
  },
]
const values = { ...DEFAULT_VALUES, slice: 0, explode: 0 }

describe('legacy positions (LEVELS)', () => {
  it('validates and looks up positions', () => {
    expect(isValidPosition(L, { level: 1, step: 0 })).toBe(true)
    expect(isValidPosition(L, { level: 1, step: 1 })).toBe(false)
    expect(isValidPosition(L, { level: -1, step: 0 })).toBe(false)
    expect(stepAt(L, { level: 0, step: 1 }).id).toBe('a2')
    expect(() => stepAt(L, { level: 2, step: 0 })).toThrow(RangeError)
    expect(positionOf(L, 'b1')).toEqual({ level: 1, step: 0 })
    expect(() => positionOf(L, 'zz')).toThrow('unknown step zz')
  })
})

describe('isSatisfied', () => {
  it('is true without a condition and compares the control value otherwise', () => {
    expect(isSatisfied(undefined, values)).toBe(true)
    expect(isSatisfied({ control: 'slice', min: 0.4 }, { ...values, slice: 0.39 })).toBe(false)
    expect(isSatisfied({ control: 'slice', min: 0.4 }, { ...values, slice: 0.4 })).toBe(true)
    expect(isSatisfied({ control: 'years', min: 3 }, { ...values, years: 5 })).toBe(true)
  })
})

describe('controlRange', () => {
  it('uses the default range unless the step narrows it', () => {
    const plain = L[0]!.steps[0]!
    expect(controlRange(plain, 'years')).toEqual([0, 10])
    expect(controlRange(plain, 'phase')).toEqual([0, 1])
    expect(controlRange(plain, 'slice')).toEqual([0, 1])
    expect(controlRange(plain, 'explode')).toEqual([0, 1])
    const narrowed = { ...plain, ranges: { phase: [0, 0.5] as [number, number], slice: [0, 0.6] as [number, number] } }
    expect(controlRange(narrowed, 'phase')).toEqual([0, 0.5])
    expect(controlRange(narrowed, 'slice')).toEqual([0, 0.6])
    expect(controlRange(narrowed, 'years')).toEqual([0, 10])
  })
})

describe('sandboxPatchFor', () => {
  it('resets cut/explode/pick to defaults and keeps product when not given', () => {
    expect(sandboxPatchFor({ camera: 'tw' })).toEqual({ sliceAxis: 'x', slice: 0, explode: 0, picked: null })
  })

  it('passes through explicit values including a null product', () => {
    expect(sandboxPatchFor({ camera: 'plaza', product: null, slice: 0.5, sliceAxis: 'd', explode: 1 })).toEqual({
      productId: null, sliceAxis: 'd', slice: 0.5, explode: 1, picked: null,
    })
  })
})

describe('titleOf / lineOf / moreOf', () => {
  it('returns static text or calls the template with the context', () => {
    const ctx = { weightPct: () => 57.35, shock: () => -0.17, sectorPct: () => 0, expenseRatio: () => 0.002, overlapShared: () => 0.3, exitFee: () => 0, assetClassPct: () => 0, fundFeeRows: () => [] }
    expect(titleOf(L[0]!.steps[0]!)).toBe('T1')
    expect(lineOf(L[0]!.steps[0]!, ctx)).toBe('x')
    expect(moreOf(L[0]!.steps[0]!, ctx)).toBe('mx')
    expect(lineOf(L[1]!.steps[0]!, ctx)).toBe('w=57.35')
    expect(moreOf(L[1]!.steps[0]!, ctx)).toBe('er=0.002')
  })
})

describe('resumePosition (saved progress after the lesson changed)', () => {
  it('keeps a valid saved position', () => {
    expect(resumePosition(L, { level: 1, step: 0 })).toEqual({ level: 1, step: 0 })
  })
  it('a step that no longer exists falls back to the last step of the same chapter', () => {
    expect(resumePosition(L, { level: 0, step: 5 })).toEqual({ level: 0, step: L[0]!.steps.length - 1 })
  })
  it('finds the saved step by id even when its index moved', () => {
    const last = L[L.length - 1]!
    const lastStep = last.steps[last.steps.length - 1]!
    expect(resumePosition(L, { level: 0, step: 0 }, lastStep.id)).toEqual({ level: L.length - 1, step: last.steps.length - 1 })
  })
  it('an unknown or invalid saved id falls back to the saved position, then to the start', () => {
    expect(resumePosition(L, { level: 1, step: 0 }, 'nope')).toEqual({ level: 1, step: 0 })
    expect(resumePosition(L, { level: 99, step: 0 }, 'nope')).toEqual({ level: 0, step: 0 })
    expect(resumePosition(L, undefined, 'nope')).toEqual({ level: 0, step: 0 })
  })
  it('migrates an old save (no id) in the fund chapter, where f-6 and f-7 merged into one step', () => {
    const fund = REAL.findIndex((l) => l.id === 'fund')
    const at = (step: number) => REAL[fund]!.steps[resumePosition(REAL, { level: fund, step }).step]!.id
    expect(at(4)).toBe('f-5')
    expect(at(5)).toBe('f-6')
    expect(at(6)).toBe('f-6') // 舊 f-7
    expect(at(7)).toBe('f-8') // 舊 f-8
    expect(at(8)).toBe('f-9') // 舊 f-9
  })
  it('migrates an old save (no id) in the stock chapter, where old s-5/s-6/s-7 became s-5/s-6', () => {
    const stock = REAL.findIndex((l) => l.id === 'stock')
    const at = (step: number) => REAL[stock]!.steps[resumePosition(REAL, { level: stock, step }).step]!.id
    expect(at(3)).toBe('s-4')
    expect(at(4)).toBe('s-5') // 舊 s-5 發金幣
    expect(at(5)).toBe('s-5') // 舊 s-6 除息（總數不變）
    expect(at(6)).toBe('s-6') // 舊 s-7 貼息
  })
  it('a chapter that no longer exists, or no saved position, starts from the beginning', () => {
    expect(resumePosition(L, { level: 9, step: 0 })).toEqual({ level: 0, step: 0 })
    expect(resumePosition(L, undefined)).toEqual({ level: 0, step: 0 })
  })
})

const ids = (c: string) => courseSteps(COURSES.find((x) => x.id === c)!).map((s) => s.id)
const B = ids('beginner')
const M = ids('intermediate')
const at = (course: 'beginner' | 'intermediate', id: string) => ({ course, index: (course === 'beginner' ? B : M).indexOf(id) })

describe('course navigation (never crosses into another course)', () => {
  it('steps through a course and stops at both ends', () => {
    expect(stepAtCourse({ course: 'beginner', index: 0 }).id).toBe('p-1')
    expect(stepAtCourse({ course: 'intermediate', index: 0 }).id).toBe('m-0')
    expect(nextIndex({ course: 'beginner', index: 0 })).toBe(1)
    expect(nextIndex({ course: 'beginner', index: B.length - 1 })).toBeNull() // u-6 之後不會跑到 m-0
    expect(prevIndex({ course: 'intermediate', index: 0 })).toBeNull()
    expect(prevIndex({ course: 'intermediate', index: 3 })).toBe(2)
    expect(stepsOf('beginner')).toBe(stepsOf('beginner')) // 同一個參考
  })

  it('validates course positions', () => {
    expect(isValidCoursePos({ course: 'beginner', index: B.length - 1 })).toBe(true)
    expect(isValidCoursePos({ course: 'beginner', index: B.length })).toBe(false)
    expect(isValidCoursePos({ course: 'beginner', index: -1 })).toBe(false)
    expect(isValidCoursePos({ course: 'beginner', index: 0.5 })).toBe(false)
    expect(isValidCoursePos({ course: 'advanced', index: 0 })).toBe(false) // 高階還沒有步驟
    expect(() => stepAtCourse({ course: 'advanced', index: 0 })).toThrow(RangeError)
  })

  it('reports progress inside the course only', () => {
    expect(progressFractionCourse({ course: 'beginner', index: 0 })).toBe(0)
    expect(progressFractionCourse({ course: 'beginner', index: 1 })).toBeCloseTo(1 / 17)
    expect(progressFractionCourse({ course: 'intermediate', index: M.length - 1 })).toBeCloseTo((M.length - 1) / M.length)
  })

  it('maps indexes to chapters and chapters to their first index', () => {
    expect(chapterOfIndex('beginner', 0)).toBe(0)
    expect(chapterOfIndex('beginner', B.indexOf('s-1'))).toBe(1)
    expect(chapterOfIndex('beginner', B.indexOf('u-6'))).toBe(5)
    expect(chapterOfIndex('intermediate', M.indexOf('p-3'))).toBe(0)
    expect(chapterOfIndex('beginner', 99)).toBe(-1)
    expect(firstIndexOfChapter('beginner', 2)).toBe(B.indexOf('b-1'))
    expect(firstIndexOfChapter('intermediate', 5)).toBe(M.indexOf('m-fin'))
    expect(firstIndexOfChapter('beginner', 9)).toBeNull()
  })

  it('the next course follows course order and skips nothing that is unavailable', () => {
    expect(nextCourse('beginner')).toBe('intermediate')
    expect(nextCourse('intermediate')).toBeNull() // 高階還沒開放
    expect(nextCourse('advanced')).toBeNull()
  })

  it('switching course keeps the step when the new course has it, else the first step', () => {
    expect(switchTarget('intermediate', 'p-1')).toEqual({ course: 'intermediate', index: 0 })
    expect(switchTarget('intermediate', 'b-2')).toEqual(at('intermediate', 'b-2'))
    expect(switchTarget('beginner', undefined)).toEqual({ course: 'beginner', index: 0 })
    expect(indexOfStep('beginner', 'm-0')).toBe(-1)
  })
})

describe('progress persistence (per course)', () => {
  it('round-trips the new format and tolerates garbage', () => {
    const p = { course: 'intermediate' as const, stepId: 'b-2', completed: { beginner: ['prologue'], intermediate: ['review'], advanced: [] }, finished: ['beginner' as const], sandboxUnlocked: true }
    expect(parseProgress(serializeProgress(p))).toEqual(p)
    expect(parseProgress(null)).toEqual(emptyProgress())
    expect(parseProgress('{oops')).toEqual(emptyProgress())
    expect(parseProgress('[1,2]')).toEqual(emptyProgress())
    expect(parseProgress('{"course":"weird","completed":{"beginner":[1,"stock"]},"finished":["x","beginner"]}')).toEqual({
      course: null, completed: { beginner: ['stock'], intermediate: [], advanced: [] }, finished: ['beginner'], sandboxUnlocked: true,
    })
  })

  it('a stepId outside the saved course resumes at that course’s first step', () => {
    expect(parseProgress('{"course":"beginner","stepId":"b-2","completed":{},"finished":[],"sandboxUnlocked":false}')).toMatchObject({ course: 'beginner', stepId: 'p-1' })
  })

  it('an unavailable course is treated as not chosen', () => {
    expect(parseProgress('{"course":"advanced","completed":{},"finished":[],"sandboxUnlocked":false}').course).toBeNull()
  })
})

describe('resumeCoursePosition (old saves)', () => {
  it('first visit or garbage → null (start card)', () => {
    expect(resumeCoursePosition(null)).toBeNull()
    expect(resumeCoursePosition('x')).toBeNull()
    expect(resumeCoursePosition({ completed: [], sandboxUnlocked: false })).toBeNull()
    expect(resumeCoursePosition({ course: null })).toBeNull()
  })

  it('an old save with a stepId goes to the course that has that step', () => {
    expect(resumeCoursePosition({ completed: [], sandboxUnlocked: false, stepId: 'f-8' })).toEqual(at('intermediate', 'f-8'))
    expect(resumeCoursePosition({ completed: [], sandboxUnlocked: false, stepId: 'f-5', route: 'full' })).toEqual(at('beginner', 'f-5'))
  })

  it('an old save without an id uses the old migration (merged fund/stock steps) then finds the course', () => {
    const fund = REAL.findIndex((l) => l.id === 'fund')
    const stock = REAL.findIndex((l) => l.id === 'stock')
    expect(resumeCoursePosition({ pos: { level: fund, step: 6 } })).toEqual(at('intermediate', 'f-6')) // 舊 f-7
    expect(resumeCoursePosition({ pos: { level: fund, step: 8 } })).toEqual(at('beginner', 'f-9'))
    expect(resumeCoursePosition({ pos: { level: stock, step: 5 } })).toEqual(at('intermediate', 's-5'))
    expect(resumeCoursePosition({ pos: { level: 2, step: 1 } })).toEqual(at('intermediate', 'b-2'))
    expect(resumeCoursePosition({ pos: { level: 99, step: 0 } })).toEqual(at('beginner', 'p-1'))
  })

  it('an old simple-route save whose step is not in 初階 lands on the nearest earlier 初階 step', () => {
    expect(resumeCoursePosition({ route: 'simple', stepId: 'f-6' })).toEqual(at('beginner', 'f-5'))
    expect(resumeCoursePosition({ route: 'simple', stepId: 'u-3' })).toEqual(at('beginner', 'c-2'))
    expect(resumeCoursePosition({ route: 'simple', stepId: 'b-3' })).toEqual(at('beginner', 'b-3'))
    expect(resumeCoursePosition({ route: 'simple', pos: { level: 1, step: 4 } })).toEqual(at('beginner', 's-3')) // s-5
    expect(resumeCoursePosition({ route: 'simple' })).toEqual({ course: 'beginner', index: 0 })
  })

  it('an unknown old stepId falls back to the old position', () => {
    expect(resumeCoursePosition({ stepId: 'gone', pos: { level: 1, step: 0 } })).toEqual(at('beginner', 's-1'))
  })

  it('parseProgress migrates an old save: course, stepId, completed chapters per course, sandbox kept', () => {
    const p = parseProgress(JSON.stringify({ completed: ['prologue', 'stock'], sandboxUnlocked: true, pos: { level: 2, step: 1 } }))
    expect(p.course).toBe('intermediate')
    expect(p.stepId).toBe('b-2')
    expect(p.sandboxUnlocked).toBe(true)
    expect(p.finished).toEqual([])
    expect(p.completed.beginner).toEqual(['prologue', 'stock'])
    expect(p.completed.intermediate).toEqual(['review', 'stock']) // 複習章的 m-0 是新步驟，看 p-3（序章）
    expect(parseProgress(JSON.stringify({ completed: [], sandboxUnlocked: false })).course).toBeNull()
  })
})

describe('parseCourseQuery / queryPosition / startOfCourse', () => {
  const pos = (search: string) => queryPosition(parseCourseQuery(search))

  it('?course=&step= wins; a step outside that course → its first step', () => {
    expect(parseCourseQuery('?course=intermediate&step=u-3')).toEqual({ mode: 'tour', course: 'intermediate', stepId: 'u-3' })
    expect(pos('?course=intermediate&step=u-3')).toEqual(at('intermediate', 'u-3'))
    expect(pos('?course=intermediate&step=p-1')).toEqual({ course: 'intermediate', index: 0 })
    expect(pos('?course=beginner')).toEqual({ course: 'beginner', index: 0 })
    expect(pos('?course=advanced')).toBeNull() // 還沒開放
    expect(pos('?course=weird')).toBeNull()
  })

  it('a bare ?step= finds its course', () => {
    expect(pos('?step=m-fin')).toEqual(at('intermediate', 'm-fin'))
    expect(pos('?step=nope')).toBeNull()
  })

  it('old ?route=: simple → 初階, full → by step (no step → 中階 first step)', () => {
    expect(pos('?route=simple')).toEqual({ course: 'beginner', index: 0 })
    expect(pos('?route=full')).toEqual({ course: 'intermediate', index: 0 })
    expect(pos('?route=full&level=1&step=4')).toEqual(at('intermediate', 's-5'))
    expect(pos('?route=simple&level=1&step=4')).toEqual(at('beginner', 's-3'))
    expect(pos('?route=weird')).toBeNull()
  })

  it('old ?level=&step= (absolute) → the course of that step; invalid ones are ignored', () => {
    expect(pos('?level=2&step=1')).toEqual(at('intermediate', 'b-2'))
    expect(pos('?level=0&step=0')).toEqual(at('beginner', 'p-1'))
    expect(pos('?level=9&step=0')).toBeNull()
    expect(pos('')).toBeNull()
  })

  it('sandbox parameters mean sandbox mode', () => {
    expect(parseCourseQuery('?mode=sandbox').mode).toBe('sandbox')
    expect(parseCourseQuery('?product=0050&slice=0.5').mode).toBe('sandbox')
    expect(parseCourseQuery('?mode=sandbox&course=beginner')).toEqual({ mode: 'sandbox', course: 'beginner' })
  })

  it('start: URL, then save, then the start card', () => {
    const empty = emptyProgress()
    expect(startOfCourse(empty, {})).toEqual({ course: null, pos: { course: 'beginner', index: 0 } })
    const saved = { ...empty, course: 'intermediate' as const, stepId: 'u-3' }
    expect(startOfCourse(saved, {})).toEqual({ course: 'intermediate', pos: at('intermediate', 'u-3') })
    expect(startOfCourse(saved, parseCourseQuery('?course=beginner&step=e-1'))).toEqual({ course: 'beginner', pos: at('beginner', 'e-1') })
  })
})
