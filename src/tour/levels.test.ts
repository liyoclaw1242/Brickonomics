import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { overlap } from '../sim/overlap'
import { LEVELS } from './levels'
import { makeTextContext } from './context'
import { textOf } from './engine'
import type { Stage } from './types'

const ctx = makeTextContext(universe)
const steps = LEVELS.flatMap((l) => l.steps)
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'exchangeWide', 'exchangeSide', 'plaza', 'plazaNear']

const assetsIn = (s: Stage): string[] => {
  if (s.kind === 'held') return s.items.map((i) => i.assetId)
  if (s.kind === 'overlap') return [s.a, s.b]
  return []
}

describe('LEVELS', () => {
  it('has the prologue plus five levels in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'scenario'])
    for (const l of LEVELS) expect(l.steps.length, l.id).toBeGreaterThan(0)
  })

  it('uses unique step ids', () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
  })

  it('references only valid presets, baskets and assets', () => {
    for (const s of steps) {
      expect(PRESETS, s.id).toContain(s.scene.camera)
      if (s.scene.cameraFrom) expect(PRESETS, s.id).toContain(s.scene.cameraFrom)
      if (s.scene.product) expect(isBasket(universe.get(s.scene.product)!), s.id).toBe(true)
      if (s.scene.stage) for (const id of assetsIn(s.scene.stage)) expect(universe.has(id), `${s.id}:${id}`).toBe(true)
    }
  })

  it('only waits on controls the step exposes', () => {
    for (const s of steps) if (s.until) expect(s.controls ?? [], s.id).toContain(s.until.control)
  })

  it('renders every text without errors, non-empty, and never mentions 稅', () => {
    for (const s of steps) {
      const t = textOf(s, ctx)
      expect(t.length, s.id).toBeGreaterThan(10)
      expect(t, s.id).not.toContain('稅')
    }
  })

  it('labels illustrative stages as 示意 in their text', () => {
    const illustrative = new Set(['held', 'exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker'])
    for (const s of steps) {
      const kind = s.scene.stage?.kind
      if (kind && illustrative.has(kind) && !(kind === 'held' && s.scene.stage?.kind === 'held' && s.scene.stage.items.every((i) => i.motion === 'still'))) {
        expect(textOf(s, ctx), s.id).toContain('示意')
      }
    }
  })

  it('computes numbers from data instead of hard-coding them', () => {
    const e3 = steps.find((s) => s.id === 'e-3')!
    expect(textOf(e3, ctx)).toContain('57%')
    const c2 = steps.find((s) => s.id === 'c-2')!
    expect(textOf(c2, ctx)).toContain('−17.2%')
  })

  it('data facts the lesson text relies on', () => {
    const w = (p: string, h: string) => universe.get(p)?.holdings?.find((x) => x.id === h)?.weightPct
    expect(w('0050', '2330') ?? 0).toBeGreaterThan(50)
    expect(w('SPY', '2330')).toBeUndefined()
    for (const id of ['NVDA', 'MSFT', 'US_TREASURY']) expect(w('JH_BALANCED', id), id).toBeDefined()
    const ids = overlap(universe, 'QQQ', 'SPY').rows.map((r) => r.id)
    for (const id of ['NVDA', 'AAPL', 'MSFT']) expect(ids).toContain(id)
    const er = (id: string) => universe.get(id)!.fees!.expenseRatio!
    const funds = [...universe.values()].filter((a) => a.type === 'fund' && a.fees?.expenseRatio !== undefined)
    expect(funds.length).toBeGreaterThan(0)
    for (const f of funds) {
      expect(er('QQQ'), f.id).toBeLessThan(f.fees!.expenseRatio!)
      expect(er('SPY'), f.id).toBeLessThan(f.fees!.expenseRatio!)
    }
    expect(textOf(steps.find((s) => s.id === 'f-4')!, ctx)).toContain('32%')
    expect(textOf(steps.find((s) => s.id === 'e-3')!, ctx)).toContain('6%')
  })
})
