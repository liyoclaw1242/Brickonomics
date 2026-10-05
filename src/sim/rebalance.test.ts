import { describe, expect, it } from 'vitest'
import { REBALANCE, drift, rebalance } from './rebalance'

describe('rebalance example (≈ illustrative): target 60/40, then stocks +30%, bonds 0%', () => {
  it('example constant', () => {
    expect(REBALANCE).toEqual({ targetStockPct: 60, stockReturn: 0.3, bondReturn: 0 })
  })

  it('drift: stock 60 × 1.3 = 78, bond 40 × 1 = 40, total 118 → stocks 78 ÷ 118 = 66.10%', () => {
    const d = drift(REBALANCE)
    expect(d.stock).toBeCloseTo(78, 12)
    expect(d.bond).toBeCloseTo(40, 12)
    expect(d.total).toBeCloseTo(118, 12)
    expect(d.stockPct).toBeCloseTo((78 / 118) * 100, 12)
    expect(d.stockPct).toBeCloseTo(66.102, 3)
  })

  it('rebalance (trim the tall side, top up the short side): stock 0.6 × 118 = 70.8, bond 47.2; 78 − 70.8 = 7.2 moves from stocks to bonds', () => {
    const r = rebalance(drift(REBALANCE), REBALANCE.targetStockPct)
    expect(r.stock).toBeCloseTo(70.8, 12)
    expect(r.bond).toBeCloseTo(47.2, 12)
    expect(r.moved).toBeCloseTo(7.2, 12)
    expect(r.stockPct).toBeCloseTo(60, 12)
    expect(r.total).toBeCloseTo(118, 12) // 只搬家，總數不變
  })

  it('after a fall (stocks −30%): 60 × 0.7 = 42 + 40 = 82, stocks 51.22%; rebalance → 49.2 / 32.8, moved −7.2 (bonds buy stocks)', () => {
    const d = drift({ targetStockPct: 60, stockReturn: -0.3, bondReturn: 0 })
    expect(d.stockPct).toBeCloseTo((42 / 82) * 100, 12)
    const r = rebalance(d, 60)
    expect(r.stock).toBeCloseTo(49.2, 12)
    expect(r.bond).toBeCloseTo(32.8, 12)
    expect(r.moved).toBeCloseTo(-7.2, 12)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => drift({ targetStockPct: 120, stockReturn: 0, bondReturn: 0 })).toThrow(/targetStockPct/)
    expect(() => drift({ targetStockPct: 60, stockReturn: -1, bondReturn: 0 })).toThrow(/stockReturn/)
    expect(() => drift({ targetStockPct: 60, stockReturn: 0, bondReturn: NaN })).toThrow(/bondReturn/)
    expect(() => rebalance({ stock: -1, bond: 40 }, 60)).toThrow(/stock/)
    expect(() => rebalance({ stock: 0, bond: 0 }, 60)).toThrow(/total/)
    expect(() => rebalance({ stock: 50, bond: 50 }, -5)).toThrow(/targetStockPct/)
  })
})
