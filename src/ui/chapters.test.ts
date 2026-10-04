import { describe, it, expect } from 'vitest'
import { LEVELS } from '../tour/levels'
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
