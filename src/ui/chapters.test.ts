import { describe, it, expect } from 'vitest'
import { COURSES } from '../tour/courses'
import { emptyProgress, indexOfStep } from '../tour/engine'
import { chapterStates } from './chapters'

const beginner = COURSES.find((c) => c.id === 'beginner')!
const intermediate = COURSES.find((c) => c.id === 'intermediate')!
const progress = (b: string[], m: string[] = [], sandboxUnlocked = false) => ({ ...emptyProgress(), completed: { beginner: b, intermediate: m, advanced: [], practice: [] }, sandboxUnlocked })

describe('chapterStates (per course)', () => {
  it('lists the current course’s chapters with their icons and names', () => {
    const s = chapterStates(intermediate, { course: 'intermediate', index: 0 }, progress([]))
    expect(s.map((c) => `${c.icon}${c.name}`)).toEqual(['🔁複習', '🧱股票', '📜債券', '🚜基金', '🧩ETF', '🎓完成'])
    expect(s.map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('marks done, current and todo chapters', () => {
    const s = chapterStates(beginner, { course: 'beginner', index: indexOfStep('beginner', 'b-3') }, progress(['prologue', 'stock']))
    expect(s.map((c) => c.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo'])
    expect(s.map((c) => c.clickable)).toEqual([true, true, true, false, false, false])
  })

  it('keeps a revisited completed chapter as current', () => {
    const s = chapterStates(beginner, { course: 'beginner', index: 2 }, progress(['prologue', 'stock']))
    expect(s[1]!.state).toBe('current')
    expect(s[1]!.clickable).toBe(true)
  })

  it('completing 初階 does not mark 中階 chapters done', () => {
    const s = chapterStates(intermediate, { course: 'intermediate', index: 0 }, progress(['prologue', 'stock', 'bond', 'fund', 'etf', 'finish']))
    expect(s.map((c) => c.state)).toEqual(['current', 'todo', 'todo', 'todo', 'todo', 'todo'])
  })

  it('makes everything clickable once the sandbox is unlocked', () => {
    const s = chapterStates(intermediate, { course: 'intermediate', index: 0 }, progress([], [], true))
    expect(s.every((c) => c.clickable)).toBe(true)
  })
})
