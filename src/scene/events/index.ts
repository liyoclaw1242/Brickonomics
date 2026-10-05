import { LIGHTNING_TIMELINE } from './lightning'
import { QUAKE_TIMELINE } from './quake'
import { TORNADO_TIMELINE } from './tornado'
import type { EventKind, EventSpec, EventTimeline, SpecOf } from './types'

/**
 * 事件元件庫（spec §4）：步驟以 `scene.event = { kind, … }` 叫用，舞台不再各自內嵌天氣邏輯。
 * 共用規則（由 useEventClock 統一處理）：鏡頭停下後才開始；prefers-reduced-motion 直接到終點；
 * 只在動畫期間持續繪製；舞台只透過純函式讀事件進度（例如 tornadoHitAt、strikeAt）決定受損程度。
 * 這個檔案只載入各事件的時間軸（只有數字）：讀數（ui/readout）、文字版、城市（Scene）都從這裡問，不直接 import 各事件的模組。
 *
 * 新增一種事件（例如 quake）：
 * 1. types.ts：在 EventSpec 這個 union 加一個分支，例如 `| { kind: 'quake'; depth: number }`。
 *    參數只放在自己的分支裡，tsc 會檢查每一步寫的 scene.event。
 * 2. quake.ts（純 TS，不 import React/R3F，也不載入資料或方塊）：時間軸與數值（t 秒 → 畫面狀態），
 *    匯出 QUAKE_TIMELINE: EventTimeline<SpecOf<'quake'>>（duration、lingers、numberDelay、aftermath），
 *    以及舞台要用的讀取函式（t 為 null＝還沒開始、Infinity＝終點）。quake.test.ts 至少測「t = Infinity ＝ 最終狀態」。
 *    需要資料或方塊的幾何放另一個檔（像 lightningBolt.ts），不要讓這裡變重。
 * 3. Quake.tsx：元件，props 為 EventProps<SpecOf<'quake'>>；每幀讀 clock.t.current，
 *    clock.reduced 時畫靜止的終點；顏色取主題、低畫質簡化。
 * 4. 註冊：下面的 EVENTS 加 quake: QUAKE_TIMELINE；EventLayer.tsx 的 COMPONENTS 加 quake: Quake。
 *    兩者都是「每種 kind 一個」的對照表，漏了任何一個 tsc 會報錯。
 * 5. 步驟資料寫 scene: { …, event: { kind: 'quake', … } }；需要配合的舞台從 StageView 收到同一個 EventClock。
 *    讀數（ui/readout.ts）與城市（Scene.tsx）若要在事件後顯示結果，用 eventAftermath(spec)，不要直接比對 kind。
 */
export const EVENTS: { [K in EventKind]: EventTimeline<SpecOf<K>> } = {
  tornado: TORNADO_TIMELINE,
  lightning: LIGHTNING_TIMELINE,
  quake: QUAKE_TIMELINE,
}

export const EVENT_KINDS = Object.keys(EVENTS) as EventKind[]

/** 取這個 spec 的時間軸。EVENTS[spec.kind] 的參數型別與 spec 一一對應，但 TS 無法把 union 的兩邊對起來，這裡集中轉型一次 */
function timelineOf(spec: EventSpec): EventTimeline {
  return EVENTS[spec.kind] as EventTimeline
}

export const eventDuration = (spec: EventSpec): number => timelineOf(spec).duration(spec)
export const eventLingers = (spec: EventSpec): boolean => timelineOf(spec).lingers(spec)

/** 這一步的終點有沒有事件造成的後果（給讀數、文字版、城市用；與 kind 無關） */
export const eventAftermath = (spec: EventSpec | undefined): boolean => !!spec && timelineOf(spec).aftermath(spec)

/** 面板大數字等事件的關鍵時刻才開始數（毫秒；例如閃電打中）；沒有事件或減少動態時 0 */
export function bigNumberDelayMs(spec: EventSpec | undefined, reducedMotion: boolean): number {
  return !spec || reducedMotion ? 0 : timelineOf(spec).numberDelay(spec) * 1000
}

export type { EventClock, EventKind, EventProps, EventSpec, EventTimeline, LightningPhase, SpecOf } from './types'
