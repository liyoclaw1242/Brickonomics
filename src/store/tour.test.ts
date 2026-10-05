import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTour, currentStep, loadProgress } from './tour'
import { useSandbox } from './sandbox'
import { EXDIV_AFTER_PHASE } from '../tour/levels'
import { emptyProgress, indexOfStep, startOfCourse, stepsOf } from '../tour/engine'
import type { CourseId } from '../tour/types'

beforeEach(() => {
  useSandbox.setState(useSandbox.getInitialState())
  useTour.setState(useTour.getInitialState())
})

const go = (course: CourseId, id: string) => useTour.getState().enterStep({ course, index: indexOfStep(course, id) })
const idOf = () => currentStep(useTour.getState()).id

describe('useTour', () => {
  it('entering a step applies its scene to the sandbox and its values', () => {
    go('intermediate', 'f-3')
    expect(useSandbox.getState()).toMatchObject({ productId: 'JH_BALANCED', explode: 1, slice: 0 })
    go('intermediate', 'f-6')
    expect(useTour.getState().values.years).toBe(0)
    expect(useSandbox.getState().productId).toBeNull()
  })

  it('next crosses a chapter boundary and marks the chapter completed in this course only', () => {
    go('beginner', 'p-2')
    useTour.getState().next()
    expect(idOf()).toBe('s-1')
    expect(useTour.getState().progress.completed).toEqual({ beginner: ['prologue'], intermediate: [], advanced: [] })
  })

  it('finishing a course unlocks the sandbox, marks only that course finished, and switches mode', () => {
    go('beginner', 'u-6')
    useTour.getState().next()
    expect(useTour.getState().mode).toBe('sandbox')
    expect(useTour.getState().progress.sandboxUnlocked).toBe(true)
    expect(useTour.getState().progress.finished).toEqual(['beginner'])
    expect(useTour.getState().progress.completed.intermediate).toEqual([])
    expect(useSandbox.getState().productId).toBe('0050')
  })

  it('walking 初階 visits its 17 steps and never crosses into 中階', () => {
    useTour.getState().chooseCourse('beginner')
    const seen = [idOf()]
    for (let i = 0; i < 40 && useTour.getState().mode === 'tour'; i++) {
      useTour.getState().next()
      if (useTour.getState().mode === 'tour') seen.push(idOf())
    }
    expect(seen).toEqual(stepsOf('beginner').map((s) => s.id))
    expect(useTour.getState().progress.completed.beginner).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'finish'])
    expect(useTour.getState().progress.finished).toEqual(['beginner'])
  })

  it('prev at the first step of a course does nothing', () => {
    useTour.getState().chooseCourse('intermediate')
    useTour.getState().prev()
    expect(idOf()).toBe('m-0')
  })

  it('setValue clamps to the allowed range and maps NaN to the minimum', () => {
    useTour.getState().setValue('years', 99)
    expect(useTour.getState().values.years).toBe(10)
    useTour.getState().setValue('frontLoad', Number.NaN)
    expect(useTour.getState().values.frontLoad).toBe(0)
  })

  it('setValue also clamps to the current step range (s-5 stops at the payout moment)', () => {
    go('intermediate', 's-5')
    expect(useTour.getState().values.phase).toBe(0)
    useTour.getState().setValue('phase', 1)
    expect(useTour.getState().values.phase).toBe(EXDIV_AFTER_PHASE)
    go('intermediate', 's-6')
    expect(useTour.getState().values.phase).toBe(1) // 一進來就是結果
  })

  it('enterStep preserves completed/finished/sandboxUnlocked and remembers course + stepId', () => {
    useTour.setState({ progress: { ...emptyProgress(), course: 'beginner', completed: { beginner: ['prologue'], intermediate: [], advanced: [] }, sandboxUnlocked: true } })
    go('intermediate', 'b-2')
    expect(useTour.getState().progress).toEqual({
      course: 'intermediate', stepId: 'b-2', completed: { beginner: ['prologue'], intermediate: [], advanced: [] }, finished: [], sandboxUnlocked: true, lastStep: { intermediate: 'b-2' },
    })
    expect(useTour.getState().course).toBe('intermediate')
  })

  it('enterChapter jumps to the first step of that chapter in the current course', () => {
    useTour.getState().chooseCourse('intermediate')
    useTour.getState().enterChapter(3)
    expect(idOf()).toBe('f-2')
  })

  it('an unvisited course starts at its first step', () => {
    go('beginner', 'f-5')
    useTour.getState().switchCourse('intermediate')
    expect(idOf()).toBe('m-0')
    expect(useTour.getState().course).toBe('intermediate')
    expect(useTour.getState().progress.course).toBe('intermediate')
  })

  it('switchCourse resumes an unfinished course at its last step', () => {
    useTour.getState().chooseCourse('intermediate')
    go('intermediate', 'f-4')
    useTour.getState().switchCourse('beginner')
    expect(idOf()).toBe('p-1') // 初階還沒去過
    go('beginner', 'b-3')
    useTour.getState().switchCourse('intermediate')
    expect(idOf()).toBe('f-4')
    useTour.getState().switchCourse('beginner')
    expect(idOf()).toBe('b-3')
    expect(useTour.getState().progress.lastStep).toEqual({ intermediate: 'f-4', beginner: 'b-3' })
  })

  it('switchCourse to a finished course starts it over', () => {
    useTour.getState().chooseCourse('beginner')
    go('beginner', 'u-6')
    useTour.getState().next() // 上完初階
    useTour.getState().switchCourse('intermediate')
    useTour.getState().switchCourse('beginner')
    expect(idOf()).toBe('p-1')
  })

  it('chooseCourse, goNextCourse and restartCourse always start at the first step', () => {
    useTour.getState().chooseCourse('intermediate')
    go('intermediate', 'u-3')
    useTour.getState().chooseCourse('intermediate')
    expect(idOf()).toBe('m-0')
    go('intermediate', 'u-3')
    useTour.getState().restartCourse()
    expect(idOf()).toBe('m-0')
    go('intermediate', 'b-2')
    go('beginner', 'u-6')
    useTour.setState({ progress: { ...useTour.getState().progress, lastStep: { beginner: 'u-6', intermediate: 'b-2' } } })
    useTour.getState().goNextCourse()
    expect(idOf()).toBe('m-0')
  })

  it('switchCourse from the sandbox goes back to the tour', () => {
    useTour.getState().enterSandbox()
    useTour.getState().switchCourse('beginner')
    expect(useTour.getState().mode).toBe('tour')
    expect(idOf()).toBe('p-1')
  })

  it('goNextCourse from the 初階 finish marks it finished and starts 中階', () => {
    go('beginner', 'u-6')
    useTour.getState().goNextCourse()
    expect(useTour.getState().progress.finished).toEqual(['beginner'])
    expect(useTour.getState().progress.sandboxUnlocked).toBe(true)
    expect(useTour.getState().course).toBe('intermediate')
    expect(idOf()).toBe('m-0')
  })

  it('goNextCourse from the 中階 finish (高階 not open) goes to the sandbox', () => {
    go('intermediate', 'm-fin')
    useTour.getState().goNextCourse()
    expect(useTour.getState().mode).toBe('sandbox')
    expect(useTour.getState().progress.finished).toEqual(['intermediate'])
  })

  it('restartCourse starts at the first step of the current course', () => {
    go('intermediate', 'u-3')
    useTour.getState().restartCourse()
    expect(idOf()).toBe('m-0')
  })
})

describe('first visit (開場卡)', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
  })
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('does not save progress before a course is chosen, so the card is shown again next time', () => {
    useTour.setState({ course: null })
    useTour.getState().enterStep({ course: 'beginner', index: 0 })
    expect(useTour.getState().course).toBeNull()
    expect(startOfCourse(loadProgress(), {}).course).toBeNull()
    useTour.getState().chooseCourse('intermediate')
    expect(loadProgress().course).toBe('intermediate')
    expect(startOfCourse(loadProgress(), {})).toEqual({ course: 'intermediate', pos: { course: 'intermediate', index: 0 } })
  })

  it('a returning visitor with an old save resumes in the course of their step (no card)', () => {
    store.set('block-city-invest:progress', JSON.stringify({ completed: [], sandboxUnlocked: false, pos: { level: 2, step: 0 }, stepId: 'b-1' }))
    expect(startOfCourse(loadProgress(), {})).toEqual({ course: 'beginner', pos: { course: 'beginner', index: indexOfStep('beginner', 'b-1') } })
  })

  it('restartCourse before choosing returns to the start card', () => {
    useTour.setState({ course: null, mode: 'sandbox' })
    useTour.getState().restartCourse()
    expect(useTour.getState().mode).toBe('tour')
    expect(useTour.getState().course).toBeNull()
  })
})
