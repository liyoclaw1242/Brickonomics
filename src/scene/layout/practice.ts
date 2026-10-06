import { COVERED_CALL, coveredCall, type CoveredCallOutcome } from '../../sim/coveredCall'
import type { SpecOf } from '../events/types'
import type { FundCheckup } from '../../data/fundCheckup'
import { payoutSources } from '../../sim/checkup'

/**
 * 實戰課（Plan 9）的舞台幾何與拉桿 → 數值（純 TS；課文 levels.ts、3D 舞台、讀數共用同一份）。
 * 數值一律從 src/sim 的函式與它們的舉例常數算出來；座標相對廣場中心。
 */

// ───────────── x-cc 掩護性買權（天花板＋權利金金幣；上漲時 🌤） ─────────────

/** 一座塔在廣場中間（起點 100＝unit × 100 高）；權利金金幣疊在塔的右邊（每 1% 一枚，coinT 厚） */
export const CC_LAYOUT = { x: -1.5, w: 4, unit: 0.12, coinX: 3.8, coinR: 1.3, coinT: 0.3 } as const

export type CcNow = CoveredCallOutcome & {
  /** 拉桿值（整數 %，限制在 COVERED_CALL 的範圍） */
  movePct: number
  move: number
  /** 塔留下來的那截頂端（起點 100 的單位）＝100 × (1 + min(move, cap)) */
  kept: number
  /** 一般持有會到的高度＝100 × (1 + move)；比 kept 高的那段＝賣掉的 */
  full: number
  /** 天花板＝100 × (1 + cap) */
  ceiling: number
  /** 權利金（起點 100 的單位）＝100 × premium */
  coin: number
  /** 金幣疊幾枚（每 1% 一枚，四捨五入） */
  coins: number
}

/** 拉桿值（整數 %）→ 這一刻的塔、天花板、金幣（sim/coveredCall） */
export function ccNow(movePct: number): CcNow {
  const { cap, premium, minMovePct, maxMovePct } = COVERED_CALL
  const m = Math.min(maxMovePct, Math.max(minMovePct, Math.round(Number.isFinite(movePct) ? movePct : 0)))
  const move = m / 100
  const r = coveredCall({ move, cap, premium })
  return { ...r, movePct: m, move, kept: 100 * (1 + Math.min(move, cap)), full: 100 * (1 + move), ceiling: 100 * (1 + cap), coin: 100 * premium, coins: Math.round(100 * premium) }
}

/** 上漲時（拉桿 ≥ 1%，scene.eventWhen）放晴：太陽在塔的左後方（不擋住賣掉的空框）；參數固定，不跟著拉桿變 */
export const CC_RISE_MIN = 1
export const ccSunny = (): SpecOf<'sunnyTree'> => ({ kind: 'sunnyTree', sun: [-10, 8, -20] })

// ───────────── x-pay 每月配息 vs 淨值（真資料，不是示意） ─────────────

/**
 * 一排 13 根月底淨值柱（起點＋12 個月），每根前面一疊這個月的配息金幣（下金色＝收益、上紅色＝本金）。
 * 柱子從 floor（最低淨值往下取整再少 2 美元）起畫，所以看得到幾美元的差別；金幣用同一個「每美元多高」（unit），和柱子的落差可以直接比。
 */
export const NP_LAYOUT = { spacing: 2.4, barW: 1.4, unit: 1.2, coinZ: 1.9, coinR: 0.6, floorBelow: 2 } as const

export function navPayoutLayout(f: FundCheckup) {
  const nav = f.navMonthEnd.value
  if (!nav) throw new Error('checkup: no navMonthEnd')
  const months = [nav.baseline, ...nav.items]
  const floor = Math.floor(Math.min(...months.map((m) => m.nav))) - NP_LAYOUT.floorBelow
  const mid = (months.length - 1) / 2
  const hOf = (v: number) => (v - floor) * NP_LAYOUT.unit
  const bars = months.map((m, i) => ({ date: m.date, nav: m.nav, x: (i - mid) * NP_LAYOUT.spacing, h: hOf(m.nav) }))
  const coins = payoutSources(f).map((p) => {
    const bar = bars.find((b) => b.date.slice(0, 7) === p.recordDate.slice(0, 7))
    if (!bar) throw new Error(`checkup: no month-end NAV for the payout on ${p.recordDate}`)
    return { recordDate: p.recordDate, amount: p.amount, capitalPct: p.capitalPct, x: bar.x, incomeH: p.income * NP_LAYOUT.unit, capitalH: p.capital * NP_LAYOUT.unit }
  })
  return { floor, bars, coins, startY: hOf(nav.baseline.nav), endY: hOf(months.at(-1)!.nav) }
}
