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
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'exchangeWide', 'exchangeSide', 'plaza', 'plazaNear', 'underground']

const assetsIn = (s: Stage): string[] => {
  if (s.kind === 'held') return s.items.map((i) => i.assetId)
  if (s.kind === 'overlap') return [s.a, s.b]
  if (s.kind === 'underground') return s.cores ?? []
  return []
}

describe('LEVELS', () => {
  it('has the prologue plus six levels in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'scenario', 'underground'])
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

  it('keeps the e-3 premise true: 2330 is 0050\'s largest holding and 2454 the second largest', () => {
    // OTHER_* 是「其他」彙總部位，不是單一公司
    const sorted = universe.get('0050')!.holdings!.filter((h) => !h.id.startsWith('OTHER')).sort((a, b) => b.weightPct - a.weightPct)
    expect(sorted[0]!.id).toBe('2330')
    expect(sorted[1]!.id).toBe('2454')
  })

  it('derives the shock percentage in c-1 and c-2 from SHOCK_2330', () => {
    const c1 = textOf(steps.find((s) => s.id === 'c-1')!, ctx)
    const c2 = textOf(steps.find((s) => s.id === 'c-2')!, ctx)
    expect(c1).toContain('下跌 30%') // 0.3 × 100
    expect(c2).toContain('只買台積電：−30.0%')
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
    const undergroundIllustrative = new Set(['dig', 'veins', 'gold'])
    for (const s of steps) {
      const st = s.scene.stage
      if (st?.kind === 'underground' && undergroundIllustrative.has(st.show)) expect(textOf(s, ctx), s.id).toContain('示意')
      const kind = st?.kind
      if (kind && illustrative.has(kind) && !(kind === 'held' && s.scene.stage?.kind === 'held' && s.scene.stage.items.every((i) => i.motion === 'still'))) {
        expect(textOf(s, ctx), s.id).toContain('示意')
      }
    }
  })

  it('computes numbers from data instead of hard-coding them', () => {
    const e3 = steps.find((s) => s.id === 'e-3')!
    expect(textOf(e3, ctx)).toContain('56%') // pct0(56.31)
    const c2 = steps.find((s) => s.id === 'c-2')!
    expect(textOf(c2, ctx)).toContain('−16.9%') // -0.3 * 56.31% = -16.893%
  })

  it('derives the u-2 semiconductor percentage from sectorPct', () => {
    const u2 = steps.find((s) => s.id === 'u-2')!
    expect(textOf(u2, ctx)).toContain(`${ctx.sectorPct('0050', 'semiconductor').toFixed(0)}%`)
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
