import { STORM, stressTest, type StressResult } from '../../sim/portfolio'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { clamp01, smooth } from '../events/ease'

/**
 * 高階步驟（Plan 8）的舞台幾何與拉桿 → 數值（純 TS；課文 levels.ts、3D 舞台、讀數共用同一份）。
 * 數值一律從 src/sim 的函式與它們的舉例常數算出來；座標相對廣場中心。
 */

// ───────────── a-port 自己蓋組合塔（🌪 龍捲風） ─────────────

/** 債券比例最多 80%：再多，這場示意風暴裡塔反而變高，「少掉」不成立 */
export const PORT_MAX_BOND = 80

/** 一座塔在廣場中間：寬 w；100 萬＝height 高 */
export const PORT_LAYOUT = { x: 0, w: 5, height: 12 } as const

export type PortNow = { bondPct: number; stockPct: number; before: { stock: number; bond: number }; after: StressResult }

/** 拉桿值 → 債券比例（取到 10 的倍數、限制在 0..PORT_MAX_BOND）與風暴前後各一截多少（投入 100） */
export function portNow(bondPct: number): PortNow {
  const b = Math.min(PORT_MAX_BOND, Math.max(0, Math.round((Number.isFinite(bondPct) ? bondPct : 0) / 10) * 10))
  const stockPct = 100 - b
  return { bondPct: b, stockPct, before: { stock: stockPct, bond: b }, after: stressTest({ stockPct, scenario: STORM }) }
}

/** 龍捲風掃到塔的進度 0..1（t＝事件時間；null＝還沒來） */
export function portDamageAt(t: number | null): number {
  if (t === null) return 0
  if (t === Infinity) return 1
  return smooth(clamp01((t - timeAtX(PORT_LAYOUT.x)) / TORNADO.damage))
}

/** 塔的兩截高度（世界單位）：damage 0＝風暴前、1＝風暴後，中間線性內插；top＝塔頂 */
export function portTower(bondPct: number, damage: number): { stock: number; bond: number; top: number } {
  const n = portNow(bondPct)
  const k = PORT_LAYOUT.height / 100
  const stock = (n.before.stock + (n.after.stock - n.before.stock) * damage) * k
  const bond = (n.before.bond + (n.after.bond - n.before.bond) * damage) * k
  return { stock, bond, top: stock + bond }
}
