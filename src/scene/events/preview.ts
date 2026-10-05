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
