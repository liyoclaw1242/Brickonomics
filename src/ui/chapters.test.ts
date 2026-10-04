import { describe, it, expect } from 'vitest'
import { LEVELS, ROUTES } from '../tour/levels'
import { positionOf } from '../tour/engine'
import { chapterStates } from './chapters'

describe('chapterStates', () => {
  it('marks done, current and todo chapters', () => {
    const s = chapterStates(LEVELS, { level: 2, step: 0 }, { completed: ['prologue', 'stock'], sandboxUnlocked: false })
    expect(s.map((c) => c.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo', 'todo'])
    expect(s.map((c) => c.clickable)).toEqual([true, true, true, false, false, false, false])
  })
  it('keeps a revisited completed chapter as current', () => {
    const s = chapterStates(LEVELS, { level: 1, step: 0 }, { completed: ['prologue', 'stock'], sandboxUnlocked: false })
    expect(s[1]!.state).toBe('current')
    expect(s[1]!.clickable).toBe(true)
  })
  it('makes everything clickable once the sandbox is unlocked', () => {
    const s = chapterStates(LEVELS, { level: 0, step: 0 }, { completed: [], sandboxUnlocked: true })
    expect(s.every((c) => c.clickable)).toBe(true)
  })
})

describe('chapterStates in the simple route', () => {
  const simple = ROUTES.simple!
  it('lists only chapters with route steps, numbered in route order, and the recap-only chapter is 完成', () => {
    const s = chapterStates(LEVELS, positionOf(LEVELS, 'b-3'), { completed: ['prologue', 'stock'], sandboxUnlocked: false }, simple)
    expect(s.map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(s.map((c) => c.number)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(s.map((c) => c.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo', 'todo'])
    expect(s.map((c) => c.finish)).toEqual([false, false, false, false, false, false, true])
  })
  it('the full route never shows 完成', () => {
    const s = chapterStates(LEVELS, { level: 0, step: 0 }, { completed: [], sandboxUnlocked: false })
    expect(s.some((c) => c.finish)).toBe(false)
    expect(s.map((c) => c.number)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it('skips chapters without route steps and renumbers the rest', () => {
    const s = chapterStates(LEVELS, positionOf(LEVELS, 'e-1'), { completed: [], sandboxUnlocked: false }, ['p-1', 'e-1', 'u-6'])
    expect(s.map((c) => c.index)).toEqual([0, 4, 6])
    expect(s.map((c) => c.number)).toEqual([0, 1, 2])
    expect(s[1]!.state).toBe('current')
  })
})
