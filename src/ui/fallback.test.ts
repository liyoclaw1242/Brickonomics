import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { makeTextContext } from '../tour/context'
import { lineOf, moreOf } from '../tour/engine'
import { fallbackLevels } from './fallback'

describe('fallbackLevels', () => {
  const out = fallbackLevels(LEVELS, universe)

  it('has every level and step with rendered text', () => {
    expect(out).toHaveLength(LEVELS.length)
    out.forEach((l, i) => {
      expect(l.steps).toHaveLength(LEVELS[i]!.steps.length)
      for (const s of l.steps) {
        expect(s.title.length, s.id).toBeGreaterThan(0)
        expect(s.line.length, s.id).toBeGreaterThan(3)
        expect(s.more.length, s.id).toBeGreaterThan(10)
      }
    })
    expect(out[0]!.label).toBe('序章')
  })

  it('u-6 uses its own honest text: no 已經解鎖, no claim that the sandbox is here', () => {
    const u6 = out.flatMap((l) => l.steps).find((s) => s.id === 'u-6')!
    const step = LEVELS.flatMap((l) => l.steps).find((s) => s.id === 'u-6')!
    const ctx = makeTextContext(universe)
    expect(u6.more).not.toBe(moreOf(step, ctx))
    expect(u6.line).not.toBe(lineOf(step, ctx))
    expect(u6.more).not.toContain('解鎖')
    expect(u6.line).not.toContain('解鎖')
    expect(u6.more).toContain('在支援 3D 的瀏覽器上')
  })

  it('uses the 3D line and more when a step has no text-only version', () => {
    const step = LEVELS.flatMap((l) => l.steps).find((s) => s.id === 'e-3')!
    const e3 = out.flatMap((l) => l.steps).find((s) => s.id === 'e-3')!
    const ctx = makeTextContext(universe)
    expect(e3.title).toBe(step.title)
    expect(e3.line).toBe(lineOf(step, ctx))
    expect(e3.more).toBe(moreOf(step, ctx))
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
