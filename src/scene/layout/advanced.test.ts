import { describe, expect, it } from 'vitest'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { PORT_LAYOUT, PORT_MAX_BOND, portDamageAt, portNow, portTower } from './advanced'
import { CORR_LAYOUT, corrBlocks, corrDropAt, corrLightning, corrNow } from './advanced'
import { IMPACT_TIME } from '../events/lightning'
import { PAIRS, combine, volatility } from '../../sim/correlation'
import { DT_LAYOUT, dtNow, dtTower } from './advanced'
import { DUR_LAYOUT, durFreeze, durNow, durPose } from './advanced'
import { priceChange } from '../../sim/duration'
import { FEE_TREES, feeTreesNow } from './advanced'
import { feeDrag } from '../../sim/feeDrag'
import { universe } from '../../data'
import { LEV_LAYOUT, levNow, levWave } from './advanced'
import { waveSteps } from '../events/wave'
import { HEDGE_CASES, HEDGE_LAYOUT, hedgeDropAt, hedgeQuake, hedgeTowers } from './advanced'
import { QUAKE } from '../events/quake'
import { hedgeExample } from '../../sim/hedge'
import { REBAL_LAYOUT, rebalNow, rebalTower } from './advanced'

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

  it('second storm (stocks and bonds fall together, −25% / −15%): bonds no longer save much — 25% → 21% at 40% bonds → 17% at 80%', () => {
    expect(portNow(0, 1).after.lossPct).toBeCloseTo(25, 12)
    expect(portNow(40, 1).after.lossPct).toBeCloseTo(21, 12)
    expect(portNow(80, 1).after.lossPct).toBeCloseTo(17, 12)
    expect(portNow(40, 7).storm).toBe(1) // 限制在 0..1
    expect(portNow(40).storm).toBe(0)
    expect(portTower(40, 1, 1).top).toBeCloseTo(PORT_LAYOUT.height * 0.79, 12)
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
  it('discount and win rate sliders: 2.8 折 at 50% leaves 100 × (1 − 0.2298%)^250 ≈ 56.3; the break-even win rate moves with the cost (71.75% → 61.49%)', () => {
    const d = dtNow(250, 0.28)
    expect(d.costPerTrade).toBeCloseTo(0.001425 * 0.28 * 2 + 0.0015, 12)
    expect(d.capital).toBeCloseTo(100 * (1 - d.costPerTrade) ** 250, 9)
    expect(d.capital).toBeCloseTo(56.3, 1)
    expect(dtNow(250).breakEven).toBeCloseTo(0.7175, 12)
    expect(d.breakEven).toBeCloseTo((0.01 + d.costPerTrade) / 0.02, 12)
    // 勝率 75%、不打折：每次 +0.75% − 0.25% − 0.435% = +0.065% → 100 × 1.00065^250
    expect(dtNow(250, 1, 0.75).capital).toBeCloseTo(100 * 1.00065 ** 250, 9)
    expect(dtNow(250, 0.1, 0.4)).toMatchObject({ discount: 0.28, winRate: 0.5 }) // 限制在拉桿範圍
  })
  it('dtTower: the capital tower and the red cost pile always add up to the original height (at a 50% win rate)', () => {
    for (const t of [0, 50, 250]) {
      const h = dtTower(t)
      expect(h.capital + h.cost).toBeCloseTo(DT_LAYOUT.height, 9)
    }
    expect(dtTower(0).cost).toBe(0)
  })
})

describe('a-dur short vs long seesaw (❄️)', () => {
  it('durNow: rates 2% → 3% take a 2-year IOU down 1.91% and a 20-year IOU down 14.88% (sim/duration); the slider goes up to 5% (adv-r1: +1% was too narrow)', () => {
    expect(durNow(0.02)).toMatchObject({ short: 0, long: 0 })
    const n = durNow(0.03)
    expect(n.short).toBeCloseTo(priceChange(2, 0.02, 0.03), 12)
    expect(n.short).toBeCloseTo(-0.0191, 4)
    expect(n.long).toBeCloseTo(-0.1488, 4)
    // 2% → 5%：20 年＝2 × annuity(5%, 20) + 100 ÷ 1.05^20 = 62.61 → −37.4%；2 年＝2/1.05 + 102/1.05² = 94.42 → −5.6%
    expect(DUR_LAYOUT.rateMax).toBe(0.05)
    expect(durNow(0.05).long).toBeCloseTo(-0.3739, 3)
    expect(durNow(0.05).short).toBeCloseTo(-0.0558, 3)
    expect(durNow(0.5).rate).toBe(0.05)
    expect(durNow(Number.NaN).rate).toBe(0.02)
  })
  it('durPose: the plank tilts by the price drop × tilt; the long plank is longer, so its end drops much more — and never below the ground at 5%', () => {
    const s = durPose('short', 0.05)
    const l = durPose('long', 0.05)
    expect(s.theta).toBeCloseTo(0.0558 * DUR_LAYOUT.tilt, 3)
    expect(l.theta).toBeCloseTo(0.3739 * DUR_LAYOUT.tilt, 3)
    const drop = (p: typeof s) => DUR_LAYOUT.pivotY - p.right[1]
    expect(drop(l) / drop(s)).toBeGreaterThan(15)
    expect(l.right[1] - DUR_LAYOUT.thick / 2).toBeGreaterThan(0)
    expect(durPose('long', 0.02).theta).toBe(0)
  })
  it('the cold front frosts both IOUs where they sit at the top of the range, the 20-year one by its length (thicker frost)', () => {
    const f = durFreeze()
    expect(f.kind).toBe('freeze')
    expect(f.targets.map((t) => t.length)).toEqual([2, 20])
    const [sx, sy] = durPose('short', DUR_LAYOUT.rateMax).right
    expect(f.targets[0]!.at[0]).toBeCloseTo(DUR_LAYOUT.x.short + sx, 12)
    expect(f.targets[0]!.at[1]).toBeCloseTo(sy + DUR_LAYOUT.thick / 2, 12)
  })
})

describe('a-fee30 two trees (🌤)', () => {
  const fees = { active: 0.0188, passive: 0.0014 }
  it('feeTreesNow: 6% before fees for both; after 30 years 325.0 vs 550.7 (sim/feeDrag), gap 225.7; fees ate 249.3 vs 23.6', () => {
    const n = feeTreesNow(30, fees)
    const ref = feeDrag(universe)
    expect(n.active.value).toBeCloseTo(ref.active.value, 9)
    expect(n.passive.value).toBeCloseTo(ref.passive.value, 9)
    expect(n.active.value).toBeCloseTo(325.01, 2)
    expect(n.passive.value).toBeCloseTo(550.71, 2)
    expect(n.gap).toBeCloseTo(225.70, 2)
    expect(n.active.lost).toBeCloseTo(249.34, 2)
    expect(n.noFee).toBeCloseTo(574.35, 2)
    expect(feeTreesNow(0, fees)).toMatchObject({ years: 0, gap: 0, noFee: 100 })
    expect(feeTreesNow(99, fees).years).toBe(30)
    expect(feeTreesNow(12.4, fees).years).toBe(12)
  })
  it('a tower and its red cap (fees eaten) always reach the no-fee height: same return before fees, made visible', () => {
    for (const y of [0, 10, 30]) {
      const n = feeTreesNow(y, fees)
      for (const k of ['active', 'passive'] as const) expect(n[k].value + n[k].lost).toBeCloseTo(n.noFee, 9)
    }
    expect(FEE_TREES.unit * feeTreesNow(30, fees).noFee).toBeLessThanOrEqual(12) // 塔頂在鏡頭裡
  })
})

describe('a-lev leverage towers in the 🌊 wave', () => {
  it('levNow: −10%/+10% five times; plain and inverse end at 95.10, the 2× tower at 81.54 (sim/leverage)', () => {
    const n = levNow()
    expect(n.plain.at(-1)).toBeCloseTo(95.099, 3)
    expect(n.double.at(-1)).toBeCloseTo(81.537, 3) // 100 × 0.96^5
    expect(n.inverse.at(-1)).toBeCloseTo(95.099, 3)
    expect(n.double[1]).toBeCloseTo(80, 12) // 第一道浪打到：2 倍塔 −20%
    expect(n.round).toEqual({ plain: expect.any(Number), double: expect.any(Number), inverse: expect.any(Number) })
    expect(n.round.plain).toBeCloseTo(0.01, 12) // 1 − 0.9 × 1.1
    expect(n.round.double).toBeCloseTo(0.04, 12) // 1 − 0.8 × 1.2
    expect(n.round.inverse).toBeCloseTo(0.01, 12) // 1 − 1.1 × 0.9
  })
  it('the wave has one swell per round and splashes the three towers; tower heights = path × unit', () => {
    const w = levWave()
    expect(w.waves).toBe(5)
    expect(waveSteps(w)).toBe(levNow().plain.length - 1)
    expect(w.targets).toHaveLength(3)
    expect(w.targets!.map((t) => t.at[0])).toEqual([...LEV_LAYOUT.x])
    expect(LEV_LAYOUT.unit * 120).toBeLessThanOrEqual(9) // 2 倍塔最高（第一道浪退下時 96 → 不會超過 120）
    expect(w.numberAtEnd).toBe(true) // 大數字等浪退了才數
  })
  it('what people expect from 2×: twice the market’s fall, 2 × 4.90% = 9.80% → 90.2 (the real 2× tower ends at 81.54)', () => {
    const n = levNow()
    expect(n.naiveDouble).toBeCloseTo(100 - 2 * (100 - n.plain.at(-1)!), 9)
    expect(n.naiveDouble).toBeCloseTo(90.2, 1)
    expect(n.double.at(-1)!).toBeLessThan(n.naiveDouble)
  })
})

describe('a-hedge three towers (🌋 on the big-fall day)', () => {
  const ex = hedgeExample(universe)
  it('cases in slider order: choppy year, big-rise year, then the 🌋 big-fall day (the gate, so the quake can start there)', () => {
    expect(HEDGE_CASES).toEqual(['choppy', 'boom', 'strike'])
  })
  it('hedgeTowers: each tower is split into 0050 / inverse / cash parts that add up to the sim row (sim/hedge rows)', () => {
    for (const [ci, c] of HEDGE_CASES.entries()) {
      const t = hedgeTowers(ex, ci, 1)
      expect(t.map((x) => x.id)).toEqual(['plain', 'inverse', 'cash'])
      for (const x of t) {
        const row = ex.rows.find((r) => r.id === x.id)!
        expect(x.base + x.inverse + x.cash, `${c} ${x.id}`).toBeCloseTo(row[c], 9)
        expect(x.total).toBeCloseTo(row[c], 9)
      }
    }
    // ⚡（一天）：全押 90；加反向 94（72 + 22）；少買＋現金 94（54 + 40）。一天的費用 × (1 − 0.14%)^(1/250) 只差萬分之幾
    const s = hedgeTowers(ex, 2, 1)
    expect(s[0]!.total).toBeCloseTo(90, 2)
    expect(s[1]!.base).toBeCloseTo(72, 2)
    expect(s[1]!.inverse).toBeCloseTo(22, 2)
    expect(s[2]!.base).toBeCloseTo(54, 2)
    expect(s[2]!.cash).toBe(40)
  })
  it('before the quake opens (drop 0) the big-fall case still shows the starting 100 split', () => {
    const t = hedgeTowers(ex, 2, 0)
    expect(t.map((x) => x.total)).toEqual([100, 100, 100])
    expect(t[1]!.inverse).toBe(20)
    expect(t[2]!.cash).toBe(40)
  })
  it('🌋 the whole market falls (spec §4): a pit as deep as the drop opens in front of all three towers; the drop follows the crack opening', () => {
    const q = hedgeQuake()
    expect(q.kind).toBe('quake')
    expect(q.depth).toBeCloseTo(0.1, 12) // HEDGE.strikeDrop
    expect(q.width!).toBeGreaterThan(HEDGE_LAYOUT.x.at(-1)! - HEDGE_LAYOUT.x[0]!)
    expect(q.at![1]).toBeGreaterThan(HEDGE_LAYOUT.w / 2)
    expect(hedgeDropAt(q, null)).toBe(0)
    expect(hedgeDropAt(q, QUAKE.openAt - 0.01)).toBe(0)
    expect(hedgeDropAt(q, Infinity)).toBe(1)
  })
})

describe('a-rebal trim the tall side, top up the short side', () => {
  it('rebalNow: 60/40 → stocks +30% → 78/40 (66.1% stocks) → back to 60%: 70.8/47.2, 7.2 moved (sim/rebalance)', () => {
    expect(rebalNow(0)).toMatchObject({ stage: 0, stock: 60, bond: 40, total: 100, stockPct: 60, moved: 0 })
    const d = rebalNow(1)
    expect(d.stock).toBeCloseTo(78, 12)
    expect(d.stockPct).toBeCloseTo(66.10, 2)
    const r = rebalNow(2)
    expect(r.stock).toBeCloseTo(70.8, 12)
    expect(r.bond).toBeCloseTo(47.2, 12)
    expect(r.total).toBeCloseTo(118, 12) // 總數不變
    expect(r.moved).toBeCloseTo(7.2, 12)
    expect(rebalNow(9).stage).toBe(2)
  })
  it('rebalTower: stock at the bottom, bond on top, and the target line at 60% of the tower', () => {
    const t = rebalTower(1)
    expect(t.stock + t.bond).toBeCloseTo(118 * REBAL_LAYOUT.unit, 12)
    expect(t.target).toBeCloseTo(0.6 * 118 * REBAL_LAYOUT.unit, 12)
    expect(t.stock).toBeGreaterThan(t.target) // 長歪了：股票超過目標線
    expect(rebalTower(2).stock).toBeCloseTo(rebalTower(2).target, 12)
  })
  it('the tower leans while it is off target (塔長歪了) and stands straight again after the trim', () => {
    expect(rebalTower(0).lean).toBe(0)
    expect(rebalTower(1).lean).toBeCloseTo((66.1017 - 60) * REBAL_LAYOUT.leanPerPct, 4)
    expect(rebalTower(1).lean).toBeGreaterThan(0.1) // 看得出來
    expect(rebalTower(2).lean).toBeCloseTo(0, 12)
  })
})
