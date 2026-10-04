import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, parseThemeParam } from './theme'

beforeEach(() => useThemeStore.setState(useThemeStore.getInitialState()))

describe('useThemeStore', () => {
  it('defaults to dusk with labels on and legend off', () => {
    expect(useThemeStore.getState()).toMatchObject({ theme: 'dusk', labels: true, legend: false })
  })
  it('toggles theme, labels and legend', () => {
    const s = useThemeStore.getState()
    s.toggleTheme()
    s.toggleLabels()
    s.toggleLegend()
    expect(useThemeStore.getState()).toMatchObject({ theme: 'day', labels: false, legend: true })
  })
})

describe('parseThemeParam', () => {
  it('reads ?theme=day|dusk and ignores others', () => {
    expect(parseThemeParam('?theme=day')).toBe('day')
    expect(parseThemeParam('?theme=dusk')).toBe('dusk')
    expect(parseThemeParam('?theme=x')).toBeNull()
    expect(parseThemeParam('')).toBeNull()
  })
})
