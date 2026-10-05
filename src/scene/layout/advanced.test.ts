import { describe, expect, it } from 'vitest'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { PORT_LAYOUT, PORT_MAX_BOND, portDamageAt, portNow, portTower } from './advanced'
import { CORR_LAYOUT, corrBlocks, corrDropAt, corrLightning, corrNow } from './advanced'
import { IMPACT_TIME } from '../events/lightning'
import { PAIRS, combine, volatility } from '../../sim/correlation'
import { DT_LAYOUT, dtNow, dtTower } from './advanced'

describe('a-port portfolio tower (🌪)', () => {
  it('portNow: 100 split by the bond slider; the example storm takes stocks −40%, bonds +5% (sim/portfolio STORM)', () => {
    expect(portNow(0)).toMatchObject({ stockPct: 100, bondPct: 0, before: { stock: 100, bond: 0 } })
    expect(portNow(0).after.remaining).toBeCloseTo(60, 12) // 100 × 0.6
    expect(portNow(0).after.lossPct).toBeCloseTo(40, 12)
    expect(portNow(40).after.stock).toBeCloseTo(36, 12) // 60 × 0.6
    expect(portNow(40).after.bond).toBeCloseTo(42, 12) // 40 × 1.05
    expect(portNow(40).after.lossPct).toBeCloseTo(22, 12) // 100 − 78
    // 拉桿值四捨五入到 10 的倍數、限制在 0..PORT_MAX_BOND（80：再多就變成「漲」，標籤「少掉」不成立）
    expect(portNow(43).bondPct).toBe(40)
    expect(portNow(999).bondPct).toBe(PORT_MAX_BOND)
    expect(portNow(PORT_MAX_BOND).after.lossPct).toBeGreaterThan(0) // 20 × 0.6 + 80 × 1.05 = 96 → 少 4
    expect(portNow(Number.NaN).bondPct).toBe(0)
  })

  it('the tornado reaches the tower at timeAtX(x) and the damage eases in over STORM.damage', () => {
    expect(portDamageAt(null)).toBe(0)
    expect(portDamageAt(timeAtX(PORT_LAYOUT.x) - 0.01)).toBe(0)
    expect(portDamageAt(timeAtX(PORT_LAYOUT.x) + TORNADO.damage)).toBe(1)
    expect(portDamageAt(Infinity)).toBe(1)
  })

  it('portTower: segment heights in world units — before the storm 100 → PORT_LAYOUT.height, after it the stock part shrinks and the bond part sits on top', () => {
    const before = portTower(40, 0)
    expect(before.stock).toBeCloseTo(PORT_LAYOUT.height * 0.6, 12)
    expect(before.bond).toBeCloseTo(PORT_LAYOUT.height * 0.4, 12)
    expect(before.top).toBeCloseTo(PORT_LAYOUT.height, 12)
    const after = portTower(40, 1)
    expect(after.stock).toBeCloseTo(PORT_LAYOUT.height * 0.36, 12)
    expect(after.bond).toBeCloseTo(PORT_LAYOUT.height * 0.42, 12)
    expect(after.top).toBeCloseTo(PORT_LAYOUT.height * 0.78, 12) // 少掉的那一截＝22%
    const mid = portTower(40, 0.5)
    expect(mid.top).toBeCloseTo(PORT_LAYOUT.height * 0.89, 12) // 線性內插
  })
})

describe('a-corr two linked pairs (⚡)', () => {
  it('corrNow: the strike day is the period where a falls 8%; together partner −4%, opposite partner +8% (sim/correlation PAIRS)', () => {
    const n = corrNow()
    expect(n.a).toBeCloseTo(-0.08, 12)
    expect(n.together).toBeCloseTo(-0.04, 12)
    expect(n.opposite).toBeCloseTo(0.08, 12)
    expect(n.mixTogether).toBeCloseTo(-0.06, 12) // (−8 − 4) ÷ 2
    expect(n.mixOpposite).toBeCloseTo(0, 12) // (−8 + 8) ÷ 2
    expect(n.mixTogether).toBeCloseTo(combine(PAIRS.a, PAIRS.same, 0.5)[1]!, 12)
  })
  it('how much each one swings over the whole example: a 10%, half-half together 8%, half-half opposite 2%', () => {
    const v = corrNow().swing
    expect(v.alone).toBeCloseTo(volatility(PAIRS.a), 12)
    expect(v.alone).toBeCloseTo(0.1, 12)
    expect(v.together).toBeCloseTo(0.08, 12)
    expect(v.opposite).toBeCloseTo(0.02, 12)
  })
  it('the bolt lands on top of the struck block in each pair; the drop eases in after the impact', () => {
    const l = corrLightning()
    expect(l.kind).toBe('lightning')
    expect(l.phase).toBe('strike')
    expect(l.targets).toEqual([
      [CORR_LAYOUT.pairs.together - CORR_LAYOUT.half, CORR_LAYOUT.height, 0],
      [CORR_LAYOUT.pairs.opposite - CORR_LAYOUT.half, CORR_LAYOUT.height, 0],
    ])
    expect(corrDropAt(null)).toBe(0)
    expect(corrDropAt(IMPACT_TIME - 0.01)).toBe(0)
    expect(corrDropAt(Infinity)).toBe(1)
  })
  it('corrBlocks: heights from 100 = CORR_LAYOUT.height, scaled by (1 + move × drop)', () => {
    const b0 = corrBlocks(0)
    for (const x of b0) expect(x.h).toBeCloseTo(CORR_LAYOUT.height, 12)
    const b1 = corrBlocks(1)
    expect(b1.map((x) => x.id)).toEqual(['togetherA', 'togetherB', 'oppositeA', 'oppositeB'])
    expect(b1[0]!.h).toBeCloseTo(CORR_LAYOUT.height * 0.92, 12)
    expect(b1[1]!.h).toBeCloseTo(CORR_LAYOUT.height * 0.96, 12)
    expect(b1[3]!.h).toBeCloseTo(CORR_LAYOUT.height * 1.08, 12)
  })
})

describe('a-dt day-trade drain', () => {
  it('dtNow follows the slider: 250 trades at a 50% win rate (±1%) and 0.435% cost each leave 33.63; the rest went to costs', () => {
    expect(dtNow(0)).toMatchObject({ n: 0, capital: 100, costPaid: 0 })
    const n = dtNow(250)
    expect(n.costPerTrade).toBeCloseTo(0.001425 * 2 + 0.0015, 12) // 手續費買賣各一次（公告上限）＋賣出交易成本
    expect(n.capital).toBeCloseTo(100 * (1 - 0.00435) ** 250, 9) // 33.63
    expect(n.capital).toBeCloseTo(33.63, 2)
    expect(n.capital + n.costPaid).toBeCloseTo(100, 9) // 賺賠互相抵銷：少掉的全部付給了交易成本
    expect(dtNow(20).capital).toBeCloseTo(91.65, 2)
    expect(dtNow(123).n).toBe(120) // 取到 10 的倍數
    expect(dtNow(999).n).toBe(250)
    expect(dtNow(Number.NaN).n).toBe(0)
  })
  it('dtTower: the capital tower and the red cost pile always add up to the original height', () => {
    for (const t of [0, 50, 250]) {
      const h = dtTower(t)
      expect(h.capital + h.cost).toBeCloseTo(DT_LAYOUT.height, 9)
    }
    expect(dtTower(0).cost).toBe(0)
  })
})
