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

  it('a finish step offers the next tier, or the sandbox when the next tier is not open', () => {
    useTour.getState().enterStep({ course: 'beginner', index: stepsOf('beginner').length - 1 })
    expect(render()).toContain(T.course.nextTier('中階'))
    useTour.getState().switchCourse('intermediate')
    expect(render()).not.toContain(T.course.nextTier('中階'))
    useTour.getState().enterStep({ course: 'intermediate', index: stepsOf('intermediate').length - 1 })
    expect(render()).toContain(T.course.toSandbox)
  })
})
