import type { Quality } from '../quality'

/**
 * 事件元件庫的共用型別（純 TS）。新增事件種類的步驟見 ./index.ts。
 * 一種金融事件只對應一種自然現象：tornado＝經濟衰退／金融風暴、lightning＝單一公司出事。
 */

/** 閃電的階段：gather＝烏雲聚集（還沒打）、strike＝打一次 */
export type LightningPhase = 'gather' | 'strike'

/**
 * 步驟資料用 `scene.event` 叫用事件。每種事件一個分支（依 kind 區分），各自的參數在自己的分支裡檢查型別。
 * Plan 7/8 會再加 quake、freeze、heatwave、bubble、sunnyTree、wave。
 */
export type EventSpec = { kind: 'tornado' } | { kind: 'lightning'; phase: LightningPhase }

export type EventKind = EventSpec['kind']

/** 某一種事件的 spec（例如 SpecOf<'lightning'>） */
export type SpecOf<K extends EventKind> = Extract<EventSpec, { kind: K }>

/** 每種事件的時間軸摘要：共用時鐘（useEventClock）、面板、讀數與城市只透過它認識事件 */
export type EventTimeline<S extends EventSpec = EventSpec> = {
  /** 從鏡頭停下起算，走到終點（＝最終狀態）的秒數；0＝靜態畫面，不跑動畫 */
  duration: (spec: S) => number
  /** 終點之後是否仍每幀重繪（例如龍捲風停在旁邊原地轉）；false＝到終點就停止持續繪製 */
  lingers: (spec: S) => boolean
  /** 面板大數字等幾秒才開始數（例如等閃電打中）；0＝不等 */
  numberDelay: (spec: S) => number
  /** 這一步的終點有沒有「事件造成的後果」（損傷、跌幅）：沒有 3D 的地方（讀數、文字版）與城市用它決定要不要顯示結果 */
  aftermath: (spec: S) => boolean
}

/**
 * 事件時鐘（useEventClock 回傳；舞台與事件元件共用同一個）。
 * t.current：從鏡頭停下起算的秒數；null＝還沒開始；Infinity＝直接在終點（減少動態或靜態事件）。
 * t 每幀更新、不觸發 re-render；需要離散狀態（例如「打中了沒」）用 useEventValue。
 */
export type EventClock = {
  spec: EventSpec | undefined
  t: { readonly current: number | null }
  /** 已走到終點 */
  done: boolean
  /** prefers-reduced-motion：直接顯示終點的靜態畫面 */
  reduced: boolean
  /** 每次重新開始（換步驟、換事件、鏡頭停下）都會變：useEventValue 用它立刻重算 */
  epoch: string
}

/** 每個事件元件收到的 props（spec 已縮小到自己的那一種） */
export type EventProps<S extends EventSpec = EventSpec> = { spec: S; clock: EventClock; quality: Quality }
