// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useTour } from '../store/tour'
import { useSandbox } from '../store/sandbox'
import { TourPanel } from './TourPanel'
import { T } from './strings'
import { stepsOf } from '../tour/engine'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let el: HTMLDivElement
beforeEach(() => {
  useSandbox.setState(useSandbox.getInitialState())
  useTour.setState(useTour.getInitialState())
  el = document.createElement('div')
  root = createRoot(el)
})
afterEach(() => act(() => root.unmount()))

/** 畫出面板，回傳看得到的文字 */
function render(): string {
  act(() => root.render(<TourPanel />))
  return el.textContent ?? ''
}

describe('TourPanel start card', () => {
  it('shows the start card only while no course is chosen', () => {
    useTour.setState({ course: null })
    const first = render()
    expect(first).toContain(T.course.startTitle)
    expect(first).toContain('初階')
    expect(first).toContain('中階')
    expect(first).not.toContain('高階') // 還沒開放
    expect(first).not.toContain(T.next)
    useTour.getState().chooseCourse('beginner')
    const after = render()
    expect(after).not.toContain(T.course.startTitle)
    expect(after).toContain(T.next)
  })

  it('a finish step offers the next tier; the last course’s finish step does not (only 自由玩), and no skip link', () => {
    useTour.setState({ progress: { ...useTour.getState().progress, sandboxUnlocked: true } })
    useTour.getState().enterStep({ course: 'beginner', index: 1 })
    expect(render()).toContain(T.skipToSandbox) // 平常的步驟：解鎖後有「跳過導覽」
    useTour.getState().enterStep({ course: 'beginner', index: stepsOf('beginner').length - 1 })
    const u6 = render()
    expect(u6).toContain(T.course.nextTier('中階'))
    expect(u6).not.toContain(T.skipToSandbox)
    useTour.getState().enterStep({ course: 'intermediate', index: stepsOf('intermediate').length - 1 })
    const mfin = render()
    expect(mfin).not.toContain('下一階')
    expect(mfin).not.toContain('去自由玩')
    expect(mfin).not.toContain(T.skipToSandbox)
    expect(mfin).toContain(T.finish)
  })
})

describe('step counter inside the course (mid-r1)', () => {
  it('shows 第 i / n 步 next to the chapter counter, moving on every step', () => {
    useTour.getState().chooseCourse('intermediate')
    const n = stepsOf('intermediate').length
    expect(n).toBe(23)
    expect(render()).toContain(T.stepCount(1, n))
    useTour.getState().next()
    expect(render()).toContain(T.stepCount(2, n))
    expect(T.stepCount(7, 23)).toBe('第 7 / 23 步')
  })
})
