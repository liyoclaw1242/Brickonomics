import type { EventKind, EventSpec, SpecOf } from './types'

/**
 * DEV 事件預覽頁（`?eventPreview=<kind>`）的網址參數（純 TS）。只有 DEV 會走到這裡（main.tsx 以 import.meta.env.DEV 擋住，
 * 正式版的打包結果不含預覽頁；`npm run build` 之後的 scripts/check-dev-only.mjs 會檢查）。
 *
 * 共用參數：
 * - `t=<秒>`：定格在事件時間 t（截圖用；例如 `t=1.2`）；`t=end`＝終點。沒給＝鏡頭就位後從頭播一次。
 * - `reduced=1`：模擬 prefers-reduced-motion（直接畫靜止的終點）。
 * - `theme=day|dusk`、`quality=high|low`：與主程式相同。
 * 各事件自己的參數見 PREVIEW_SPECS。預覽場景的假方塊位置（PREVIEW_LAYOUT）也放在這裡，事件 spec 用同一組座標。
 */

export type PreviewOptions = {
  spec: EventSpec
  /** 定格的事件時間；null＝從頭播放；Infinity＝終點 */
  t: number | null
  reduced: boolean
}

/** 預覽場景的假方塊與事件目標（相對廣場中心） */
export const PREVIEW_LAYOUT = {
  /** 地震：坑在前面，後面一排高低不同的柱子（像價格時間線） */
  quakePit: [0, 3.5] as [number, number],
  quakeBars: [3, 5, 7, 4.5, 2.5, 4] as readonly number[],
  /** 泡泡：右邊那棟（太貴）被包住；左邊一棟一樣價格但正常的當對照 */
  bubbleTarget: { at: [4, 0, 0] as [number, number, number], size: [3, 7, 3] as [number, number, number] },
  /** 寒流：三塊長短不同的板子（短、中、長借據），左邊對齊、前短後長 */
  freezeBoards: [
    { at: [-4.5, 0, 4.5] as [number, number, number], size: [3, 2, 1.6] as [number, number, number] },
    { at: [-2.5, 0, 0.5] as [number, number, number], size: [7, 2, 1.6] as [number, number, number] },
    { at: [0, 0, -3.5] as [number, number, number], size: [12, 2, 1.6] as [number, number, number] },
  ],
  bubbleOther: { at: [-6, 0, 0] as [number, number, number], size: [3, 7, 3] as [number, number, number] },
} as const

/** 讀一個數字參數並限制範圍；沒給或不是數字時用預設值 */
export function numParam(q: URLSearchParams, key: string, def: number, min: number, max: number): number {
  const raw = q.get(key)
  const v = raw === null || raw.trim() === '' ? NaN : Number(raw)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def
}

/** 每種事件：從網址參數組出預覽用的 spec（漏了任何一種 tsc 會報錯） */
export const PREVIEW_SPECS: { [K in EventKind]: (q: URLSearchParams) => SpecOf<K> } = {
  tornado: () => ({ kind: 'tornado' }),
  lightning: (q) => ({ kind: 'lightning', phase: q.get('phase') === 'gather' ? 'gather' : 'strike' }),
  // depth＝跌幅（0–1），例如 0.4＝最多少掉 40%
  quake: (q) => ({ kind: 'quake', depth: numParam(q, 'depth', 0.4, 0, 1), at: PREVIEW_LAYOUT.quakePit, width: 9 }),
  // phase=float|pop；lift＝浮起高度（沒給＝依目標大小自動）
  bubble: (q) => ({
    kind: 'bubble',
    phase: q.get('phase') === 'pop' ? 'pop' : 'float',
    target: PREVIEW_LAYOUT.bubbleTarget,
    ...(q.has('lift') ? { lift: numParam(q, 'lift', 2.5, 0, 12) } : {}),
  }),
  // amount＝霜有多厚（0–1）；長的板子霜更厚
  freeze: (q) => ({ kind: 'freeze', amount: numParam(q, 'amount', 0.9, 0, 1), targets: PREVIEW_LAYOUT.freezeBoards }),
}

const isKind = (k: string | null): k is EventKind => k !== null && Object.hasOwn(PREVIEW_SPECS, k)

/** `?eventPreview=<kind>&…` → 預覽設定；沒有這個參數或 kind 不認得 → null */
export function parsePreview(search: string): PreviewOptions | null {
  const q = new URLSearchParams(search)
  const kind = q.get('eventPreview')
  if (!isKind(kind)) return null
  const build = PREVIEW_SPECS[kind] as (q: URLSearchParams) => EventSpec
  const rawT = q.get('t')
  const t = rawT === 'end' ? Infinity : rawT === null ? null : numParam(q, 't', 0, 0, 600)
  return { spec: build(q), t, reduced: q.get('reduced') === '1' }
}
