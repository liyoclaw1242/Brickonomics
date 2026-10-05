import type { EventSpec } from './events/types'

/**
 * 事件時鐘的「這一輪」（純 TS；useEventClock 用）：只有換步驟、換事件 spec、減少動態切換、鏡頭停下時才會變，變了事件就從頭播。
 * 規則（見 events/index.ts）：spec 的參數每一步固定，不跟著拉桿變；拉桿只能用 scene.eventWhen 把事件整個開或關。
 * 所以拖拉桿（例如谷底之後繼續拖時間軸）不會讓地震、寒流重播。
 */
export function eventEpoch(stepId: string, spec: EventSpec | undefined, instant: boolean, revealed: boolean): string {
  return `${stepId}|${spec ? JSON.stringify(spec) : ''}|${instant}|${revealed}`
}
