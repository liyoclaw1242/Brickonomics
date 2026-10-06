import { describe, it, expect } from 'vitest'
import { availableCourses, COURSES, courseOfStep, courseSteps, STEP_POOL } from './courses'
import { LEVELS } from './levels'
import { forbiddenWordsIn } from './glossary'
import { T } from '../ui/strings'
import type { Course, CourseId } from './types'
import { makeTextContext } from './context'
import { universe } from '../data'

const course = (id: CourseId): Course => COURSES.find((c) => c.id === id)!
const ids = (c: Course): string[] => c.chapters.flatMap((ch) => [...ch.stepIds])
const OPENING = new Set(['prologue', 'review'])
const FINISH = 'finish'
/** Plan 7 新增的中階步驟（課程專用，不在 LEVELS 裡） */
const PLAN7 = ['s-dd', 's-pe', 'b-rate', 'b-infl', 'e-dca']
/** Plan 8 的高階步驟（課程專用；照課程順序） */
const PLAN8 = ['a-0', 'a-port', 'a-corr', 'a-dt', 'a-dur', 'a-fee30', 'a-lev', 'a-hedge', 'a-rebal', 'a-fin']
/** Plan 9 實戰課的步驟（步驟池裡的順序） */
const PLAN9 = ['x-cc', 'x-pay', 'x-card', 'x-mix', 'x-where', 'x-hy', 'x-fee', 'x-perf', 'x-fin']
/** 初→中→高三階（實戰課 standalone 不在這個順序裡） */
const tiers = () => availableCourses().filter((c) => !c.standalone)
/** 內容章＝扣掉開頭（序章／複習）與結尾的章 */
const contentChapters = (c: Course) => c.chapters.filter((ch) => !OPENING.has(ch.id) && ch.id !== FINISH)

describe('STEP_POOL', () => {
  it('holds every LEVELS step plus the new recap and finish steps, each id once', () => {
    const levelIds = LEVELS.flatMap((l) => l.steps.map((s) => s.id))
    expect([...STEP_POOL.keys()]).toEqual([...levelIds, ...PLAN7, 'm-0', 'm-fin', ...PLAN8, ...PLAN9])
    for (const [id, s] of STEP_POOL) expect(s.id).toBe(id)
  })
})

describe('COURSES', () => {
  it('lists 初、中、高 in order, then 實戰; all four are open (Plan 9 opened 實戰, outside the tier order)', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['beginner', 'intermediate', 'advanced', 'practice'])
    expect(course('advanced').available).toBe(true)
    expect(course('practice')).toMatchObject({ name: '實戰', tagline: '拆解一檔真基金', available: true, standalone: true })
    expect(availableCourses().map((c) => c.id)).toEqual(['beginner', 'intermediate', 'advanced', 'practice'])
    expect(tiers().map((c) => c.id)).toEqual(['beginner', 'intermediate', 'advanced'])
  })

  it('實戰 walks one real fund: 名片 → 拆開 → 配息 → 費用 → 績效 → 體檢表, 9 steps', () => {
    const p = course('practice')
    expect(p.chapters.map((ch) => ch.name)).toEqual(['名片', '拆開', '配息', '費用', '績效', '體檢表'])
    expect(p.chapters.map((ch) => `${ch.icon}${ch.name}`)).toEqual(Object.values(T.practiceChapters).map((x) => `${x.icon}${x.name}`))
    expect(ids(p)).toEqual(['x-card', 'x-mix', 'x-where', 'x-hy', 'x-cc', 'x-pay', 'x-fee', 'x-perf', 'x-fin'])
    expect([...ids(p)].sort()).toEqual([...PLAN9].sort())
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

  it('the three tiers teach 股票 → 債券 → 基金 → ETF between the opening and the finish', () => {
    for (const c of tiers()) {
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

  it('every pool step belongs to exactly one available course', () => {
    for (const id of STEP_POOL.keys()) {
      const n = availableCourses().filter((c) => ids(c).includes(id)).length
      expect(n, id).toBe(1)
    }
    for (const id of PLAN9) expect(courseOfStep(id), id).toBe('practice')
  })

  it('a-fin recaps 高階 in four lines with the words its steps use, and is the last course (no next tier)', () => {
    const fin = STEP_POOL.get('a-fin')!
    expect(fin.recap!.map((r) => r.icon)).toEqual(['🧱', '📜', '🚜', '🧩'])
    const text = fin.recap!.map((r) => r.text).join('')
    for (const [id, w] of [['a-corr', '一起'], ['a-dt', '當沖'], ['a-lev', '耗損'], ['a-hedge', '對沖'], ['a-rebal', '剪高補低']] as const) {
      expect(text, w).toContain(w)
      const s = STEP_POOL.get(id)!
      expect(`${s.title}${typeof s.line === 'string' ? s.line : ''}`, `${id}: ${w}`).toContain(w)
    }
    expect(typeof fin.line === 'string' ? fin.line : '').toContain(T.finish)
  })

  it('高階 (Plan 8) opens with a-0, which repeats the 中階 recap (m-fin)', () => {
    expect(ids(course('advanced'))).toEqual(PLAN8)
    expect(course('advanced').chapters.map((ch) => ch.id)).toEqual(['review', 'stock', 'bond', 'fund', 'etf', 'finish'])
    expect(course('advanced').chapters.map((ch) => ch.stepIds)).toEqual([
      ['a-0', 'a-port'],
      ['a-corr', 'a-dt'],
      ['a-dur'],
      ['a-fee30'],
      ['a-lev', 'a-hedge', 'a-rebal'],
      ['a-fin'],
    ])
    const a0 = STEP_POOL.get('a-0')!
    expect(a0.recap).toEqual(STEP_POOL.get('m-fin')!.recap)
    expect(a0.scene.camera).toBe('overview')
  })

  it('every tier ends with a four-line recap card; 實戰 ends with a 5–6 line checkup card, each line dated', () => {
    for (const c of tiers()) {
      const last = courseSteps(c).at(-1)!
      expect(last.recap, c.id).toHaveLength(4)
    }
    const fin = courseSteps(course('practice')).at(-1)!
    expect(fin.id).toBe('x-fin')
    const lines = fin.checkupCard!(makeTextContext(universe))
    expect(lines.length).toBeGreaterThanOrEqual(5)
    expect(lines.length).toBeLessThanOrEqual(6)
    for (const l of lines) expect(l.asOf, l.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('m-0 repeats the 初階 recap (u-6) and opens on the city overview', () => {
    const m0 = STEP_POOL.get('m-0')!
    expect(m0.recap).toEqual(STEP_POOL.get('u-6')!.recap)
    expect(m0.scene.camera).toBe('overview')
  })

  it('m-fin recaps 中階 with its own four lines and points to 高階 (the next-tier button)', () => {
    const fin = STEP_POOL.get('m-fin')!
    const u6 = STEP_POOL.get('u-6')!.recap!.map((r) => r.text)
    expect(fin.recap!.map((r) => r.icon)).toEqual(['🧱', '📜', '🚜', '🧩'])
    for (const r of fin.recap!) expect(u6).not.toContain(r.text)
    expect(typeof fin.line === 'string' ? fin.line : '').toContain('高階')
    expect(typeof fin.more === 'string' ? fin.more : '').toContain('自由玩已經解鎖')
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
    expect(courseOfStep('a-0')).toBe('advanced')
    expect(courseOfStep('a-fin')).toBe('advanced')
    expect(courseOfStep('f-7')).toBeUndefined()
    expect(courseOfStep('')).toBeUndefined()
  })
})
