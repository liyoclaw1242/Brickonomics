import { describe, it, expect } from 'vitest'
import { stepMarks } from './marks'
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

  it('carries step-level marks into the text-only version', () => {
    const steps = LEVELS.flatMap((l) => l.steps).filter((s) => s.mark)
    expect(steps.length).toBeGreaterThan(0)
    const flat = out.flatMap((l) => l.steps)
    for (const s of steps) expect(flat.find((f) => f.id === s.id)!.marks, s.id).toContain(s.mark)
    // 標題旁的標示和 3D 版一致（含從資料推出來的「還沒查證」）
    for (const s of LEVELS.flatMap((l) => l.steps)) expect(flat.find((f) => f.id === s.id)!.marks, s.id).toEqual(stepMarks(s, universe))
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

  it('shows the closing recap in the text-only version too', () => {
    const u6 = out.flatMap((l) => l.steps).find((s) => s.id === 'u-6')!
    const step = LEVELS.flatMap((l) => l.steps).find((s) => s.id === 'u-6')!
    expect(u6.recap).toEqual(step.recap)
    expect(u6.recap!.length).toBe(4)
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
    // 文字版不能拖：有門檻的步驟顯示「做完那個動作」之後的數字（s-5：拉到發金幣那一刻）
    const exdiv = out.flatMap((l) => l.steps).find((s) => s.id === 's-5')!
    expect(exdiv.rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
    const gap = out.flatMap((l) => l.steps).find((s) => s.id === 's-6')!
    expect(gap.rows.map((r) => r.value)).toEqual(['92.0', '5.0', '97.0'])
    expect(exdiv.line).not.toMatch(/^拖/) // 文字版沒有拉桿
  })
})
