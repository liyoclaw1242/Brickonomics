import { describe, it, expect, beforeEach } from 'vitest'
import { useQuality } from './quality'

beforeEach(() => useQuality.setState(useQuality.getInitialState()))

describe('useQuality', () => {
  it('degrades from high to low once and raises the notice', () => {
    useQuality.getState().setQuality('high')
    useQuality.getState().degrade()
    expect(useQuality.getState()).toMatchObject({ quality: 'low', degraded: true })
  })

  it('does nothing when already low', () => {
    useQuality.getState().setQuality('low')
    useQuality.getState().degrade()
    expect(useQuality.getState()).toMatchObject({ quality: 'low', degraded: false })
  })

  it('dismisses the notice', () => {
    useQuality.getState().setQuality('high')
    useQuality.getState().degrade()
    useQuality.getState().dismissNotice()
    expect(useQuality.getState().degraded).toBe(false)
  })
})
