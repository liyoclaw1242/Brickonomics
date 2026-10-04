import { describe, it, expect } from 'vitest'
import type { Level } from './types'
import { LEVELS as REAL } from './levels'
import {
  DEFAULT_VALUES, stepAt, isValidPosition, nextPosition, prevPosition, positionOf, progressFraction,
  isSatisfied, sandboxPatchFor, lineOf, moreOf, titleOf, parseProgress, serializeProgress, parseTourQuery, controlRange, resumePosition,
  snapToRoute, firstInLevel, firstPosition, inRoute, initialRoute, startOf,
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

describe('navigation', () => {
  it('walks steps, crosses levels, and ends with null', () => {
    expect(nextPosition(L, { level: 0, step: 0 })).toEqual({ level: 0, step: 1 })
    expect(nextPosition(L, { level: 0, step: 1 })).toEqual({ level: 1, step: 0 })
    expect(nextPosition(L, { level: 1, step: 0 })).toBeNull()
  })

  it('goes back across levels and stops at the start', () => {
    expect(prevPosition(L, { level: 1, step: 0 })).toEqual({ level: 0, step: 1 })
    expect(prevPosition(L, { level: 0, step: 0 })).toBeNull()
  })

  it('validates and looks up positions', () => {
    expect(isValidPosition(L, { level: 1, step: 0 })).toBe(true)
    expect(isValidPosition(L, { level: 1, step: 1 })).toBe(false)
    expect(isValidPosition(L, { level: -1, step: 0 })).toBe(false)
    expect(stepAt(L, { level: 0, step: 1 }).id).toBe('a2')
    expect(() => stepAt(L, { level: 2, step: 0 })).toThrow(RangeError)
    expect(positionOf(L, 'b1')).toEqual({ level: 1, step: 0 })
    expect(() => positionOf(L, 'zz')).toThrow('unknown step zz')
  })

  it('reports progress as steps before the current one over all steps', () => {
    expect(progressFraction(L, { level: 0, step: 0 })).toBe(0)
    expect(progressFraction(L, { level: 1, step: 0 })).toBeCloseTo(2 / 3)
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

describe('progress persistence', () => {
  it('round-trips and tolerates garbage', () => {
    const p = { completed: ['a'], sandboxUnlocked: true }
    expect(parseProgress(serializeProgress(p))).toEqual(p)
    const withPos = { ...p, pos: { level: 3, step: 2 } }
    expect(parseProgress(serializeProgress(withPos))).toEqual(withPos)
    expect(parseProgress(null)).toEqual({ completed: [], sandboxUnlocked: false })
    expect(parseProgress('{oops')).toEqual({ completed: [], sandboxUnlocked: false })
    expect(parseProgress('{"completed":[1,"b"],"sandboxUnlocked":"yes"}')).toEqual({ completed: ['b'], sandboxUnlocked: false })
  })

  it('round-trips a saved position and drops invalid ones', () => {
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"pos":{"level":2,"step":1}}').pos).toEqual({ level: 2, step: 1 })
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"pos":{"level":-1,"step":"x"}}').pos).toBeUndefined()
  })
})

describe('parseTourQuery', () => {
  it('reads mode and a valid position', () => {
    expect(parseTourQuery('?mode=sandbox', L)).toEqual({ mode: 'sandbox' })
    expect(parseTourQuery('?level=1&step=0', L)).toEqual({ mode: 'tour', pos: { level: 1, step: 0 } })
  })

  it('treats sandbox parameters as sandbox mode and ignores invalid positions', () => {
    expect(parseTourQuery('?product=0050&slice=0.5', L)).toEqual({ mode: 'sandbox' })
    expect(parseTourQuery('?level=9&step=0', L)).toEqual({})
    expect(parseTourQuery('', L)).toEqual({})
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
  it('parseProgress keeps a string stepId and ignores a non-string one', () => {
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"stepId":"f-8"}').stepId).toBe('f-8')
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"stepId":5}').stepId).toBeUndefined()
  })
  it('a chapter that no longer exists, or no saved position, starts from the beginning', () => {
    expect(resumePosition(L, { level: 9, step: 0 })).toEqual({ level: 0, step: 0 })
    expect(resumePosition(L, undefined)).toEqual({ level: 0, step: 0 })
  })
})

describe('routes (簡單版只走一部分步驟)', () => {
  // a1, a2 | b1 ；路線只有 a1、b1
  const R = ['a1', 'b1']

  it('next and prev skip steps outside the route', () => {
    expect(nextPosition(L, { level: 0, step: 0 }, R)).toEqual({ level: 1, step: 0 })
    expect(nextPosition(L, { level: 1, step: 0 }, R)).toBeNull()
    expect(prevPosition(L, { level: 1, step: 0 }, R)).toEqual({ level: 0, step: 0 })
    expect(prevPosition(L, { level: 0, step: 0 }, R)).toBeNull()
    // null＝完整版：每一步都走
    expect(nextPosition(L, { level: 0, step: 0 }, null)).toEqual({ level: 0, step: 1 })
  })

  it('reports progress over route steps only', () => {
    expect(progressFraction(L, { level: 0, step: 0 }, R)).toBe(0)
    expect(progressFraction(L, { level: 1, step: 0 }, R)).toBe(1 / 2)
    expect(progressFraction(L, { level: 1, step: 0 }, null)).toBeCloseTo(2 / 3)
  })

  it('snaps to the nearest route step at or before the position (or the first one)', () => {
    expect(snapToRoute(L, { level: 0, step: 1 }, R)).toEqual({ level: 0, step: 0 })
    expect(snapToRoute(L, { level: 1, step: 0 }, R)).toEqual({ level: 1, step: 0 })
    expect(snapToRoute(L, { level: 0, step: 0 }, ['b1'])).toEqual({ level: 1, step: 0 })
    expect(snapToRoute(L, { level: 0, step: 1 }, null)).toEqual({ level: 0, step: 1 })
  })

  it('finds the first route step of a chapter and of the whole route', () => {
    expect(firstInLevel(L, 0, ['a2', 'b1'])).toEqual({ level: 0, step: 1 })
    expect(firstInLevel(L, 0, ['b1'])).toBeNull()
    expect(firstPosition(L, ['a2', 'b1'])).toEqual({ level: 0, step: 1 })
    expect(firstPosition(L, null)).toEqual({ level: 0, step: 0 })
    expect(inRoute(L, { level: 0, step: 1 }, R)).toBe(false)
    expect(inRoute(L, { level: 0, step: 1 }, null)).toBe(true)
  })

  it('resumes inside the route', () => {
    expect(snapToRoute(L, resumePosition(L, undefined, 'a2'), R)).toEqual({ level: 0, step: 0 })
  })

  it('reads ?route= and keeps level/step absolute', () => {
    expect(parseTourQuery('?route=simple', L)).toEqual({ route: 'simple' })
    expect(parseTourQuery('?route=full&level=0&step=1', L)).toEqual({ mode: 'tour', pos: { level: 0, step: 1 }, route: 'full' })
    expect(parseTourQuery('?route=weird', L)).toEqual({})
  })

  it('persists the chosen route with the progress', () => {
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"route":"simple"}').route).toBe('simple')
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"route":"x"}').route).toBeUndefined()
  })

  it('asks for a route only on a first visit', () => {
    const empty = { completed: [], sandboxUnlocked: false }
    expect(initialRoute(empty, {})).toBeNull() // 第一次來：問
    expect(initialRoute({ ...empty, route: 'simple' }, {})).toBe('simple')
    expect(initialRoute({ ...empty, stepId: 'a2', pos: { level: 0, step: 1 } }, {})).toBe('full') // 舊存檔：完整版
    expect(initialRoute({ ...empty, sandboxUnlocked: true }, {})).toBe('full')
    expect(initialRoute(empty, { route: 'simple' })).toBe('simple') // 網址指定
    expect(initialRoute({ ...empty, route: 'simple' }, { route: 'full' })).toBe('full')
    expect(initialRoute(empty, { mode: 'tour', pos: { level: 0, step: 1 } })).toBe('full') // 直接連到某一步
  })
})

describe('startOf (where the page opens)', () => {
  const routes = { full: null, simple: ['a1', 'b1'] } as const
  const empty = { completed: [], sandboxUnlocked: false }
  it('first visit: no route yet, first step', () => {
    expect(startOf(L, empty, {}, routes)).toEqual({ route: null, pos: { level: 0, step: 0 } })
  })
  it('resumes a saved simple route inside the route', () => {
    expect(startOf(L, { ...empty, route: 'simple', stepId: 'b1', pos: { level: 1, step: 0 } }, {}, routes)).toEqual({ route: 'simple', pos: { level: 1, step: 0 } })
    expect(startOf(L, { ...empty, route: 'simple', stepId: 'a2' }, {}, routes)).toEqual({ route: 'simple', pos: { level: 0, step: 0 } })
  })
  it('a deep link to a step outside the saved route opens the full route there', () => {
    expect(startOf(L, { ...empty, route: 'simple' }, { mode: 'tour', pos: { level: 0, step: 1 } }, routes)).toEqual({ route: 'full', pos: { level: 0, step: 1 } })
  })
  it('an explicit ?route= wins and the deep-linked step snaps into it', () => {
    expect(startOf(L, empty, { mode: 'tour', pos: { level: 0, step: 1 }, route: 'simple' }, routes)).toEqual({ route: 'simple', pos: { level: 0, step: 0 } })
    expect(startOf(L, empty, { route: 'simple' }, routes)).toEqual({ route: 'simple', pos: { level: 0, step: 0 } })
  })
})
