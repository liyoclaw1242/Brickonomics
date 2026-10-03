import { describe, it, expect, beforeEach } from 'vitest'
import { useTour, currentStep } from './tour'
import { useSandbox } from './sandbox'
import { LEVELS } from '../tour/levels'
import { positionOf } from '../tour/engine'

beforeEach(() => {
  useSandbox.setState(useSandbox.getInitialState())
  useTour.setState(useTour.getInitialState())
})

describe('useTour', () => {
  it('entering a step applies its scene to the sandbox and its values', () => {
    useTour.getState().enterStep(positionOf(LEVELS, 'f-3'))
    expect(useSandbox.getState()).toMatchObject({ productId: 'JH_BALANCED', explode: 1, slice: 0 })
    useTour.getState().enterStep(positionOf(LEVELS, 'f-6'))
    expect(useTour.getState().values.years).toBe(0)
    expect(useSandbox.getState().productId).toBeNull()
  })

  it('next crosses a level boundary and marks the level completed', () => {
    const last = { level: 0, step: LEVELS[0]!.steps.length - 1 }
    useTour.getState().enterStep(last)
    useTour.getState().next()
    expect(useTour.getState().pos).toEqual({ level: 1, step: 0 })
    expect(useTour.getState().progress.completed).toEqual(['prologue'])
  })

  it('finishing the last step unlocks the sandbox and switches mode', () => {
    const lastLevel = LEVELS.length - 1
    useTour.getState().enterStep({ level: lastLevel, step: LEVELS[lastLevel]!.steps.length - 1 })
    useTour.getState().next()
    expect(useTour.getState().mode).toBe('sandbox')
    expect(useTour.getState().progress.sandboxUnlocked).toBe(true)
    expect(useSandbox.getState().productId).toBe('0050')
  })

  it('prev at the very start does nothing', () => {
    useTour.getState().enterStep({ level: 0, step: 0 })
    useTour.getState().prev()
    expect(useTour.getState().pos).toEqual({ level: 0, step: 0 })
  })

  it('setValue clamps to the allowed range and maps NaN to the minimum', () => {
    useTour.getState().setValue('years', 99)
    expect(useTour.getState().values.years).toBe(10)
    useTour.getState().setValue('frontLoad', Number.NaN)
    expect(useTour.getState().values.frontLoad).toBe(0)
  })

  it('currentStep follows pos', () => {
    useTour.getState().enterStep(positionOf(LEVELS, 'e-3'))
    expect(currentStep(useTour.getState()).id).toBe('e-3')
  })

  it('remembers the current position', () => {
    useTour.getState().enterStep({ level: 1, step: 2 })
    expect(useTour.getState().progress.pos).toEqual({ level: 1, step: 2 })
  })
})
