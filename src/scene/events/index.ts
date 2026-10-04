import { LIGHTNING_TIMELINE } from './lightning'
import { TORNADO_TIMELINE } from './tornado'
import type { EventKind, EventSpec, EventTimeline } from './types'

/**
 * 事件元件庫（spec §4）：步驟以 `scene.event = { kind, … }` 叫用，舞台不再各自內嵌天氣邏輯。
 * 共用規則（由 useEventClock 統一處理）：鏡頭停下後才開始；prefers-reduced-motion 直接到終點；
 * 只在動畫期間持續繪製；舞台只透過純函式讀事件進度（例如 tornadoHitAt、strikeAt）決定受損程度。
 *
 * 新增一種事件（例如 quake）：
 * 1. types.ts：把 'quake' 加進 EventKind；需要參數就在 EventSpec 加選填欄位。
 * 2. quake.ts（純 TS，不 import React/R3F）：時間軸與數值（t 秒 → 畫面狀態），匯出一個 QUAKE_TIMELINE: EventTimeline，
 *    以及舞台要用的讀取函式（t 為 null＝還沒開始、Infinity＝終點）。quake.test.ts 至少測「t = Infinity ＝ 最終狀態」。
 * 3. Quake.tsx：元件，props 為 EventProps；每幀讀 clock.t.current，clock.reduced 時畫靜止的終點；顏色取主題、低畫質簡化。
 * 4. 註冊：下面的 EVENTS 加 quake: QUAKE_TIMELINE；EventLayer.tsx 的 COMPONENTS 加 quake: Quake。
 *    兩者都是 Record<EventKind, …>，漏了任何一個 tsc 會報錯。
 * 5. 步驟資料寫 scene: { …, event: { kind: 'quake' } }；需要配合的舞台從 StageView 收到同一個 EventClock。
 */
export const EVENTS: Record<EventKind, EventTimeline> = {
  tornado: TORNADO_TIMELINE,
  lightning: LIGHTNING_TIMELINE,
}

export const EVENT_KINDS = Object.keys(EVENTS) as EventKind[]

export const eventDuration = (spec: EventSpec): number => EVENTS[spec.kind].duration(spec)
export const eventLingers = (spec: EventSpec): boolean => EVENTS[spec.kind].lingers(spec)

/** 面板大數字等事件的關鍵時刻才開始數（毫秒；例如閃電打中）；沒有事件或減少動態時 0 */
export function bigNumberDelayMs(spec: EventSpec | undefined, reducedMotion: boolean): number {
  return !spec || reducedMotion ? 0 : EVENTS[spec.kind].numberDelay(spec) * 1000
}

export type { EventClock, EventKind, EventPhase, EventProps, EventSpec, EventTimeline } from './types'
