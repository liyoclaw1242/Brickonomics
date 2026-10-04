import type { Quality } from '../quality'
import type { EventTimeline, SpecOf } from './types'

/**
 * b-3「經濟風暴」的龍捲風（純 TS）：路線、時間、每張借據什麼時候被打到、被打到之後長怎樣。
 * 3b1b「一次只變一件事」：龍捲風從左邊掃進廣場，依序經過股票→國家債→公司債→高收益債，
 * 掃到誰、誰才變（股票縮水變紅、高收益債裂開；國家債／公司債晃一下就站穩），最後停在右後方。
 * 時間 t 以秒計，從鏡頭停下那一刻起算；t = Infinity 就是終點（＝原本靜態的 stressed 畫面）。
 */

export type BondKey = 'stock' | 'gov' | 'corp' | 'hy'

/** 四個方塊在廣場上的 x（相對廣場中心） */
export const BOND_SLOT_X: Record<BondKey, number> = { stock: -13, gov: -4.5, corp: 4, hy: 12.5 }

/** 終點（＝ stressed）：股票縮成 45% 高、全紅；高收益債左右兩半各往外倒 CRACK_TILT、中間留 CRACK_GAP */
export const STOCK_STRESSED_SCALE = 0.45
export const CRACK_TILT = 0.32
export const CRACK_GAP = 0.35

export const STORM = {
  /** 從畫面左外側進場 */
  startX: -28,
  /** 最後停在高收益債的右後方：不擋住方塊與標籤 */
  lingerX: 16.5,
  lingerZ: -8,
  /** 過了高收益債之後才開始往後退 */
  turnX: 13.5,
  /** 掃過整個廣場的秒數 */
  sweep: 6.5,
  /** 被掃到之後，變形花的秒數 */
  damage: 0.7,
  /** 國家債／公司債被掃到時晃一下的秒數與角度（之後完全回正） */
  shrug: 1.1,
  shrugAngle: 0.14,
  /** 漏斗：高度、地面半徑、頂端半徑 */
  height: 10.5,
  baseRadius: 0.75,
  topRadius: 4.2,
} as const

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => {
  const u = clamp01(v)
  return u * u * (3 - 2 * u)
}

/** 掃過的進度 0..1（頭尾放慢，中間快） */
export function sweepProgress(t: number): number {
  if (!(t > 0)) return 0
  if (t >= STORM.sweep) return 1
  return (1 - Math.cos(Math.PI * (t / STORM.sweep))) / 2
}

/** 龍捲風底部的位置（相對廣場中心的 x、z）；t 為 Infinity 時就是停留點 */
export function stormPos(t: number): { x: number; z: number } {
  const x = STORM.startX + (STORM.lingerX - STORM.startX) * sweepProgress(t)
  const back = smooth((x - STORM.turnX) / (STORM.lingerX - STORM.turnX))
  return { x, z: back > 0 ? STORM.lingerZ * back : 0 }
}

/** 龍捲風底部中心經過某個 x 的時間（x 隨 t 單調遞增，二分搜尋） */
export function timeAtX(x: number): number {
  if (x <= STORM.startX) return 0
  if (x >= STORM.lingerX) return STORM.sweep
  let lo = 0
  let hi: number = STORM.sweep
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (stormPos(mid).x < x) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** 每個方塊被打到的時間（依序：股票→國家債→公司債→高收益債） */
export const HIT_TIME: Record<BondKey, number> = {
  stock: timeAtX(BOND_SLOT_X.stock),
  gov: timeAtX(BOND_SLOT_X.gov),
  corp: timeAtX(BOND_SLOT_X.corp),
  hy: timeAtX(BOND_SLOT_X.hy),
}

/** 有沒有被打到（離散：用來換標籤、停金幣） */
export const isHit = (key: BondKey, t: number): boolean => t >= HIT_TIME[key]

/** 某個方塊在時間 t 的樣子 */
export type SlotState = {
  /** 高度比例（只有股票會變） */
  scaleY: number
  /** 變紅的程度 0..1 */
  red: number
  /** 是否已裂成兩半（只有高收益債） */
  broken: boolean
  /** 裂開的兩半往外倒的角度、中間的縫 */
  tilt: number
  gap: number
  /** 被風吹得晃一下的角度（國家債／公司債；終點為 0） */
  sway: number
}

export function slotState(key: BondKey, t: number): SlotState {
  const since = t - HIT_TIME[key]
  const p = smooth(since / STORM.damage)
  const base: SlotState = { scaleY: 1, red: 0, broken: false, tilt: 0, gap: 0, sway: 0 }
  switch (key) {
    case 'stock':
      return { ...base, scaleY: (1 - p) + STOCK_STRESSED_SCALE * p, red: p }
    case 'hy':
      return since >= 0 ? { ...base, red: p, broken: true, tilt: CRACK_TILT * p, gap: CRACK_GAP * p } : base
    case 'gov':
    case 'corp': {
      // 晃一下（衰減的正弦）就站穩
      const u = since / STORM.shrug
      const sway = u > 0 && u < 1 ? STORM.shrugAngle * Math.sin(u * Math.PI * 3) * (1 - u) : 0
      return { ...base, sway }
    }
  }
}

/** 原本靜態的 stressed 畫面（終點必須一模一樣） */
export const STRESSED: Record<BondKey, SlotState> = {
  stock: { scaleY: STOCK_STRESSED_SCALE, red: 1, broken: false, tilt: 0, gap: 0, sway: 0 },
  gov: { scaleY: 1, red: 0, broken: false, tilt: 0, gap: 0, sway: 0 },
  corp: { scaleY: 1, red: 0, broken: false, tilt: 0, gap: 0, sway: 0 },
  hy: { scaleY: 1, red: 1, broken: true, tilt: CRACK_TILT, gap: CRACK_GAP, sway: 0 },
}

/** 動畫全部結束（之後只剩龍捲風在旁邊原地轉） */
export const STORM_DONE = Math.max(HIT_TIME.hy + STORM.damage, HIT_TIME.corp + STORM.shrug, STORM.sweep)

/** 事件時間軸：到 STORM_DONE 所有方塊定型；之後龍捲風停在旁邊原地轉（持續繪製到離開這一步） */
export const TORNADO_TIMELINE: EventTimeline<SpecOf<'tornado'>> = {
  duration: () => STORM_DONE,
  lingers: () => true,
  numberDelay: () => 0,
  aftermath: () => true,
}

/** 舞台讀事件時鐘用：t＝事件時間（null＝龍捲風還沒來） */
export const tornadoHitAt = (t: number | null, key: BondKey): boolean => t !== null && isHit(key, t)
export const tornadoSlotAt = (t: number | null, key: BondKey): SlotState => slotState(key, t ?? -Infinity)

/** 進場淡入 0..1（前 0.5 秒長出來） */
export const stormAppear = (t: number): number => smooth(t / 0.5)

/** 漏斗在高度 h（0..height）的半徑：越靠地面越細 */
export function funnelRadius(h: number): number {
  const u = clamp01(h / STORM.height)
  return STORM.baseRadius + (STORM.topRadius - STORM.baseRadius) * Math.pow(u, 1.6)
}

/** 漏斗在高度 h 的左右扭動（蛇形）；底部固定、越高擺越大 */
export function funnelSway(h: number, time: number): { dx: number; dz: number } {
  const u = clamp01(h / STORM.height)
  const a = 0.9 * u * u
  return { dx: a * Math.sin(time * 1.3 + u * 2.4), dz: a * 0.5 * Math.cos(time * 1.1 + u * 2) }
}

/** 各畫質的數量：低畫質環少、塵少、不下雨 */
export type StormCounts = { rings: number; dust: number; debris: number; streaks: number; ringSegments: number }
export const STORM_COUNTS: Record<Quality, StormCounts> = {
  high: { rings: 20, dust: 70, debris: 6, streaks: 36, ringSegments: 14 },
  low: { rings: 11, dust: 24, debris: 4, streaks: 0, ringSegments: 8 },
}
