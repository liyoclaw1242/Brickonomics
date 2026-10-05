import { describe, expect, it } from 'vitest'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { PORT_LAYOUT, PORT_MAX_BOND, portDamageAt, portNow, portTower } from './advanced'

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
