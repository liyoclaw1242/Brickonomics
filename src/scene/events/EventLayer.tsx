import type { ComponentType } from 'react'
import type { Quality } from '../quality'
import { Bubble } from './Bubble'
import { Freeze } from './Freeze'
import { Lightning } from './Lightning'
import { Quake } from './Quake'
import { SunnyTree } from './SunnyTree'
import { Tornado } from './Tornado'
import type { EventClock, EventKind, EventProps, SpecOf } from './types'

/** 事件種類 → 元件（新增種類的步驟見 ./index.ts；和 EVENTS 一樣是 Record，漏了 tsc 會報錯） */
const COMPONENTS: { [K in EventKind]: ComponentType<EventProps<SpecOf<K>>> } = {
  tornado: Tornado,
  lightning: Lightning,
  quake: Quake,
  bubble: Bubble,
  freeze: Freeze,
  sunnyTree: SunnyTree,
}

/** 畫出目前步驟的事件（沒有事件時什麼都不畫）；clock 由 StageView 的 useEventClock 提供，與舞台共用 */
export function EventLayer({ clock, quality }: { clock: EventClock; quality: Quality }) {
  const spec = clock.spec
  if (!spec) return null
  // COMPONENTS[spec.kind] 收的 spec 一定是同一種（TS 無法把 union 的兩邊對起來，這裡轉型一次）
  const Event = COMPONENTS[spec.kind] as ComponentType<EventProps>
  // 同一種事件跨步驟（c-1 gather → c-2 strike）不重新掛載：烏雲留在原地
  return <Event key={spec.kind} spec={spec} clock={clock} quality={quality} />
}
