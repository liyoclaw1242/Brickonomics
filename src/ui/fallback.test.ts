import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { fallbackLevels } from './fallback'

describe('fallbackLevels', () => {
  const out = fallbackLevels(LEVELS, universe)

  it('has every level and step with rendered text', () => {
    expect(out).toHaveLength(LEVELS.length)
    out.forEach((l, i) => {
      expect(l.steps).toHaveLength(LEVELS[i]!.steps.length)
      for (const s of l.steps) expect(s.text.length).toBeGreaterThan(10)
    })
    expect(out[0]!.label).toBe('序章')
  })

  it('shows one readout row on the excavator meter step', () => {
    const meter = out.flatMap((l) => l.steps).find((s) => s.id === 'f-5')!
    expect(meter.rows).toHaveLength(1)
  })

  it('includes the live numbers each step would show', () => {
    const shock = out.flatMap((l) => l.steps).find((s) => s.id === 'c-2')!
    expect(shock.rows).toHaveLength(3)
    const exdiv = out.flatMap((l) => l.steps).find((s) => s.id === 's-6')!
    expect(exdiv.rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
  })
})
