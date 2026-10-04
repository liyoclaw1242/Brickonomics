import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { currentStep, useTour } from '../store/tour'
import { eventDuration, eventLingers } from './events'
import type { EventClock, EventSpec } from './events/types'
import { useContinuousRender } from './useContinuousRender'
import { prefersReducedMotion, useRevealAfterCamera } from './useRevealAfterCamera'

/** 時鐘比其他 useFrame 早跑（負的 priority 不會接管繪製）：舞台與事件元件同一幀讀到同一個 t */
const CLOCK_PRIORITY = -1

/**
 * 事件共用時鐘：鏡頭停下才開始；prefers-reduced-motion 或靜態事件（duration 0）直接在終點（t = Infinity）；
 * 動畫期間（以及 lingers 的事件留在這一步的期間）持續繪製，其餘時間不要求重繪。換步驟或換事件就重新開始。
 * 只呼叫一次（StageView），把回傳的 clock 傳給事件元件與需要的舞台。
 */
export function useEventClock(spec: EventSpec | undefined): EventClock {
  const stepId = useTour((s) => currentStep(s).id)
  const [reduced] = useState(prefersReducedMotion)
  const invalidate = useThree((s) => s.invalidate)
  const duration = spec ? eventDuration(spec) : 0
  const lingers = spec ? eventLingers(spec) : false
  const instant = !spec || reduced || (duration <= 0 && !lingers)
  const revealed = useRevealAfterCamera(stepId, instant)
  const t = useRef<number | null>(spec && instant ? Infinity : null)
  const t0 = useRef<number | null>(null)
  const [done, setDone] = useState(!!spec && instant)
  const [version, setVersion] = useState(0)
  const running = !!spec && !instant && revealed && (!done || lingers)

  useEffect(() => {
    t0.current = null
    t.current = spec && instant ? Infinity : null
    setDone(!!spec && instant)
    setVersion((v) => v + 1)
    invalidate()
  }, [spec, instant, revealed, stepId, invalidate])

  useContinuousRender(running)

  useFrame(({ clock }) => {
    if (!running) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const now = clock.elapsedTime - t0.current
    t.current = now
    if (!done && now > duration) {
      setDone(true)
      if (!lingers) invalidate() // 最後一幀：例如閃電的光已退掉
    }
  }, CLOCK_PRIORITY)

  return useMemo(() => ({ spec, t, done, reduced, version }), [spec, done, reduced, version])
}

/**
 * 從事件時鐘讀出離散狀態（例如「打中了沒」「掃到幾個」）：值改變時才 re-render。
 * read 必須是純函式（t → 值）；重新開始時（clock.version 改變）立刻重算。
 */
export function useEventValue<V>(clock: EventClock, read: (t: number | null) => V): V {
  const [value, setValue] = useState(() => read(clock.t.current))
  const last = useRef(value)
  const readRef = useRef(read)
  readRef.current = read
  const sync = () => {
    const v = readRef.current(clock.t.current)
    if (!Object.is(v, last.current)) {
      last.current = v
      setValue(v)
    }
  }
  useEffect(sync, [clock.version, clock.spec])
  useFrame(sync)
  return value
}
