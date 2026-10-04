import type { FeeRaceRow } from '../../sim/feeRace'
import type { PeriodState } from '../../sim/dividend'
import { T } from '../../ui/strings'

/**
 * 一座方塊塔（純資料，TowerRow 負責畫）。
 * name：塔名，和數值寫在同一行（例如「前收 98.5 萬」）；label：副標。
 * lost：紅色小堆（費用扣掉的、或削掉的本金）；lostLabel：它的標註，未填為「費用扣掉的」。
 * coinsSub：金幣堆標註下面那一行。
 * door：進門費或出門費（金額已含在 lost 裡）；另外堆一小堆、寫上金額。
 * focus：這座是焦點（鮮豔）；同一排有焦點時，其他塔變暗、不畫紅色小堆。
 */
export type TowerSpec = {
  key: string
  name?: string
  label: string
  value: number
  lost?: number
  lostLabel?: string
  door?: { amount: number; label: string }
  coins?: number
  /** 金幣堆標註的副標（例如「其中 45.6 萬是本金」） */
  coinsSub?: string
  color: string
  focus?: boolean
}

const FEE_COLORS = { front: '#5c6bc0', back: '#8a5cf6', etf: '#2bb3a3' } as const

/**
 * 費用比一比（f-6「進門費、出門費」）：每座塔的 3D 文字只用三個詞——進門費、出門費、每年費用（一直在扣）。
 * 後收那座出門費歸零後，「每年費用（一直在扣）」那一堆還在，不會看起來像免費（r3）。
 */
export function feeTowerSpecs(rows: readonly FeeRaceRow[]): TowerSpec[] {
  return rows.map((r) => {
    const door = r.id === 'front' ? { amount: r.entry, label: T.towers.entry(r.entry) } : r.id === 'back' ? { amount: r.exit, label: T.towers.exit(r.exit) } : undefined
    return {
      key: r.id,
      name: T.feeTowerNames[r.id],
      label: T.feeTowers[r.id],
      value: r.value,
      lost: r.lost,
      lostLabel: T.towers.held,
      ...(door ? { door } : {}),
      color: FEE_COLORS[r.id],
    }
  })
}

/** 塔頂的標題（名稱＋數值） */
export function towerTitle(t: TowerSpec): string {
  const v = T.towers.value(t.value)
  return t.name ? `${t.name} ${v}` : v
}

/** 一座塔在 3D 上會出現的所有文字（測試用來檢查用詞） */
export function towerTexts(t: TowerSpec): string[] {
  return [
    towerTitle(t),
    t.label,
    t.lostLabel ?? T.towers.lost,
    ...(t.door ? [t.door.label] : []),
    ...(t.coins !== undefined ? [T.towers.coins(t.coins)] : []),
    ...(t.coinsSub !== undefined ? [t.coinsSub] : []),
  ]
}

/**
 * 配息陷阱（f-9，示意基金）：塔＝剩下的本金；紅色小堆＝削掉的本金；金幣堆＝領到的錢，
 * 標註下面寫「其中 X 萬是本金」——領到的錢不全是賺的（r5：91.2 ＋ 54.4 > 100，看起來像賺）。
 */
export function trapTowerSpec(st: PeriodState): TowerSpec {
  return {
    key: 'trap',
    label: T.trapRow,
    value: st.value,
    lost: st.fromPrincipal,
    lostLabel: T.towers.lostPrincipal,
    coins: st.cashReceived,
    ...(st.fromPrincipal > 0 ? { coinsSub: T.towers.coinsFromPrincipal(st.fromPrincipal) } : {}),
    color: '#ff8a3d',
  }
}
