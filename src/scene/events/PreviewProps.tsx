import type { ComponentType } from 'react'
import type { Quality } from '../quality'
import type { EventClock, EventKind, SpecOf } from './types'

/**
 * DEV 事件預覽頁的假方塊（中性的小舞台）：每種事件一個（或 null＝只畫事件本身）。
 * 舞台怎麼讀事件時鐘（例如泡泡浮起多高、金幣縮成多少），這裡就照同樣的方式示範一次。
 */
export type PreviewPropsOf<K extends EventKind> = { spec: SpecOf<K>; clock: EventClock; quality: Quality }

export const PREVIEW_PROPS: { [K in EventKind]: ComponentType<PreviewPropsOf<K>> | null } = {
  tornado: null,
  lightning: null,
}
