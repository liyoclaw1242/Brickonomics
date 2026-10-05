import { describe, it, expect } from 'vitest'
import { availableCourses, COURSES, courseOfStep, courseSteps, STEP_POOL } from './courses'
import { LEVELS } from './levels'
import { forbiddenWordsIn } from './glossary'
import { T } from '../ui/strings'
import type { Course, CourseId } from './types'

const course = (id: CourseId): Course => COURSES.find((c) => c.id === id)!
const ids = (c: Course): string[] => c.chapters.flatMap((ch) => [...ch.stepIds])
const OPENING = new Set(['prologue', 'review'])
const FINISH = 'finish'
/** Plan 7 新增的中階步驟（課程專用，不在 LEVELS 裡） */
const PLAN7 = ['s-dd', 's-pe', 'b-rate', 'b-infl', 'e-dca']
/** Plan 8 的高階步驟（課程專用；照課程順序） */
const PLAN8 = ['a-0']
/** 內容章＝扣掉開頭（序章／複習）與結尾的章 */
const contentChapters = (c: Course) => c.chapters.filter((ch) => !OPENING.has(ch.id) && ch.id !== FINISH)

describe('STEP_POOL', () => {
  it('holds every LEVELS step plus the new recap and finish steps, each id once', () => {
    const levelIds = LEVELS.flatMap((l) => l.steps.map((s) => s.id))
    expect([...STEP_POOL.keys()]).toEqual([...levelIds, ...PLAN7, 'm-0', 'm-fin', ...PLAN8])
    for (const [id, s] of STEP_POOL) expect(s.id).toBe(id)
  })
})

describe('COURSES', () => {
  it('lists 初、中、高 in order; 高階 is not available yet', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(course('advanced').available).toBe(false)
    expect(availableCourses().map((c) => c.id)).toEqual(['beginner', 'intermediate'])
  })

  it('every step id exists in STEP_POOL', () => {
    for (const c of COURSES) for (const id of ids(c)) expect(STEP_POOL.has(id), `${c.id}: ${id}`).toBe(true)
  })

  it('has no duplicate step inside a course, and 初階／中階 share no step', () => {
    for (const c of COURSES) expect(new Set(ids(c)).size, c.id).toBe(ids(c).length)
    const b = new Set(ids(course('beginner')))
    for (const id of ids(course('intermediate'))) expect(b.has(id), id).toBe(false)
  })

  it('has unique chapter ids inside a course, and no empty chapter in an available course', () => {
    for (const c of COURSES) expect(new Set(c.chapters.map((ch) => ch.id)).size, c.id).toBe(c.chapters.length)
    for (const c of availableCourses()) for (const ch of c.chapters) expect(ch.stepIds.length, `${c.id}/${ch.id}`).toBeGreaterThan(0)
  })

  it('available courses teach 股票 → 債券 → 基金 → ETF between the opening and the finish', () => {
    for (const c of availableCourses()) {
      expect(contentChapters(c).map((ch) => ch.id), c.id).toEqual(['stock', 'bond', 'fund', 'etf'])
      expect(contentChapters(c).map((ch) => `${ch.icon}${ch.name}`), c.id).toEqual(T.chapters.slice(1, 5).map((x) => `${x.icon}${x.name}`))
      expect(OPENING.has(c.chapters[0]!.id), c.id).toBe(true)
      expect(c.chapters.at(-1)!.id, c.id).toBe(FINISH)
      expect(c.chapters.length, c.id).toBe(6)
    }
  })

  it('初階 is the old 17-step simple route, chapters 序章／股票／債券／基金／ETF／完成', () => {
    const b = course('beginner')
    expect(ids(b)).toEqual(['p-1', 'p-2', 's-1', 's-2', 's-3', 'b-1', 'b-3', 'f-1', 'f-5', 'f-9', 'e-1', 'e-2', 'e-3', 'e-5', 'c-1', 'c-2', 'u-6'])
    expect(ids(b)).toHaveLength(17)
    expect(b.chapters.map((ch) => ch.id)).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'finish'])
    expect(b.chapters.map((ch) => ch.stepIds)).toEqual([
      ['p-1', 'p-2'],
      ['s-1', 's-2', 's-3'],
      ['b-1', 'b-3'],
      ['f-1', 'f-5', 'f-9'],
      ['e-1', 'e-2', 'e-3', 'e-5', 'c-1', 'c-2'],
      ['u-6'],
    ])
    expect(b.chapters[0]).toMatchObject({ icon: T.chapters[0]!.icon, name: T.chapters[0]!.name })
  })

  it('中階 covers every full-route step that 初階 leaves out (u-6 aside), plus m-0 first and m-fin last', () => {
    const m = ids(course('intermediate'))
    const b = new Set(ids(course('beginner')))
    const rest = LEVELS.flatMap((l) => l.steps.map((s) => s.id)).filter((id) => !b.has(id) && id !== 'u-6')
    expect([...m].sort()).toEqual([...rest, 'm-0', 'm-fin', ...PLAN7].sort())
    expect(m[0]).toBe('m-0')
    expect(m.at(-1)).toBe('m-fin')
    expect(course('intermediate').chapters.map((ch) => ch.stepIds)).toEqual([
      ['m-0'],
      ['s-4', 's-dd', 's-5', 's-6', 's-pe'],
      ['b-2', 'b-rate', 'b-infl'],
      ['f-2', 'f-3', 'f-4', 'f-6', 'f-8'],
      ['e-4', 'e-dca', 'c-3', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5'],
      ['m-fin'],
    ])
  })

  it('every pool step belongs to exactly one course', () => {
    for (const id of STEP_POOL.keys()) {
      const n = COURSES.filter((c) => ids(c).includes(id)).length
      expect(n, id).toBe(1)
    }
  })

  it('高階 (Plan 8) opens with a-0, which repeats the 中階 recap (m-fin)', () => {
    expect(ids(course('advanced'))).toEqual(PLAN8)
    expect(course('advanced').chapters.map((ch) => ch.id)).toEqual(['review', 'stock', 'bond', 'fund', 'etf', 'finish'])
    const a0 = STEP_POOL.get('a-0')!
    expect(a0.recap).toEqual(STEP_POOL.get('m-fin')!.recap)
    expect(a0.scene.camera).toBe('overview')
  })

  it('every available course ends with a four-line recap card', () => {
    for (const c of availableCourses()) {
      const last = courseSteps(c).at(-1)!
      expect(last.recap, c.id).toHaveLength(4)
    }
  })

  it('m-0 repeats the 初階 recap (u-6) and opens on the city overview', () => {
    const m0 = STEP_POOL.get('m-0')!
    expect(m0.recap).toEqual(STEP_POOL.get('u-6')!.recap)
    expect(m0.scene.camera).toBe('overview')
  })

  it('m-fin recaps 中階 with its own four lines and sends the learner to 自由玩 (高階 is not open yet)', () => {
    const fin = STEP_POOL.get('m-fin')!
    const u6 = STEP_POOL.get('u-6')!.recap!.map((r) => r.text)
    expect(fin.recap!.map((r) => r.icon)).toEqual(['🧱', '📜', '🚜', '🧩'])
    for (const r of fin.recap!) expect(u6).not.toContain(r.text)
    expect(typeof fin.line === 'string' ? fin.line : '').toContain(T.finish)
  })

  it('names and taglines are short, follow the glossary and avoid 被', () => {
    for (const c of COURSES) {
      for (const t of [c.name, c.tagline, ...c.chapters.map((ch) => ch.name)]) {
        expect(forbiddenWordsIn(t), `${c.id}: ${t}`).toEqual([])
        expect(t.includes('被'), `${c.id}: ${t}`).toBe(false)
        expect(t.includes('稅'), `${c.id}: ${t}`).toBe(false)
      }
      expect(Array.from(c.name).length, c.name).toBeLessThanOrEqual(4)
      expect(Array.from(c.tagline).length, c.tagline).toBeLessThanOrEqual(12)
      expect(c.tagline.length, c.id).toBeGreaterThan(0)
    }
  })
})

describe('course helpers', () => {
  it('courseSteps returns the steps in course order', () => {
    for (const c of COURSES) expect(courseSteps(c).map((s) => s.id), c.id).toEqual(ids(c))
  })

  it('courseOfStep finds the one course that holds a step', () => {
    expect(courseOfStep('p-1')).toBe('beginner')
    expect(courseOfStep('u-6')).toBe('beginner')
    // 使用者測試 mid-r1：p-3（觀光）、c-4（一句話的過場）已刪除
    expect(courseOfStep('p-3')).toBeUndefined()
    expect(courseOfStep('c-4')).toBeUndefined()
    expect(courseOfStep('m-0')).toBe('intermediate')
    expect(courseOfStep('m-fin')).toBe('intermediate')
    expect(courseOfStep('f-7')).toBeUndefined()
    expect(courseOfStep('')).toBeUndefined()
  })
})
