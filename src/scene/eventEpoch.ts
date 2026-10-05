import { eventDuration, eventLingers } from './events'
import type { EventSpec } from './events/types'

/**
 * 事件時鐘的「這一輪」（純 TS；useEventClock 用）：只有換步驟、換事件 spec、減少動態切換、鏡頭停下時才會變，變了事件就從頭播。
 * 規則（見 events/index.ts）：spec 的參數每一步固定，不跟著拉桿變；拉桿只能用 scene.eventWhen 把事件整個開或關。
 * 所以拖拉桿（例如谷底之後繼續拖時間軸）不會讓地震、寒流重播。
 */
export function eventEpoch(stepId: string, spec: EventSpec | undefined, instant: boolean, revealed: boolean): string {
  return `${stepId}|${spec ? JSON.stringify(spec) : ''}|${instant}|${revealed}`
}

/** 這個 spec 是不是「直接在終點」：沒有事件、減少動態、或靜態事件（duration 0 且不 linger） */
export function isInstant(spec: EventSpec | undefined, reduced: boolean): boolean {
  return !spec || reduced || (eventDuration(spec) <= 0 && !eventLingers(spec))
}

/**
 * 事件時鐘的兩種「直接到終點」：
 * - revealInstant：要不要等鏡頭停下（「先看再命名」）。看的是步驟資料本身有沒有事件（stepEvent），
 *   不看 eventWhen 有沒有成立：拉桿過門檻時鏡頭早就停了，不能因為 instant 從 true 變 false 又重新等一次鏡頭（Plan 7 review：晚 1.5 秒才開始）。
 * - instant：此刻的事件（spec，eventWhen 成立才有）要不要直接畫終點。
 */
export function clockMode(stepEvent: EventSpec | undefined, spec: EventSpec | undefined, reduced: boolean): { revealInstant: boolean; instant: boolean } {
  return { revealInstant: isInstant(stepEvent, reduced), instant: isInstant(spec, reduced) }
}
