import { describe, it, expect } from 'vitest'
import type { Level } from './types'
import {
  DEFAULT_VALUES, stepAt, isValidPosition, nextPosition, prevPosition, positionOf, progressFraction,
  isSatisfied, sandboxPatchFor, lineOf, moreOf, titleOf, parseProgress, serializeProgress, parseTourQuery, controlRange, resumePosition,
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
    const ctx = { weightPct: () => 57.35, shock: () => -0.17, sectorPct: () => 0, expenseRatio: () => 0.002, overlapShared: () => 0.3, exitFee: () => 0 }
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
  it('a chapter that no longer exists, or no saved position, starts from the beginning', () => {
    expect(resumePosition(L, { level: 9, step: 0 })).toEqual({ level: 0, step: 0 })
    expect(resumePosition(L, undefined)).toEqual({ level: 0, step: 0 })
  })
})
