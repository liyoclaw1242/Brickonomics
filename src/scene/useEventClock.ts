import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { currentStep, useTour } from '../store/tour'
import { eventDuration, eventLingers } from './events'
import type { EventClock, EventSpec } from './events/types'
import { useContinuousRender } from './useContinuousRender'
import { prefersReducedMotion, useRevealAfterCamera } from './useRevealAfterCamera'

/** 時鐘比其他 useFrame 早跑（負的 priority 不會接管繪製）：舞台與事件元件同一幀讀到同一個 t */
const CLOCK_PRIORITY = -1

const specKey = (spec: EventSpec | undefined): string => (spec ? JSON.stringify(spec) : '')

/**
 * 事件共用時鐘：鏡頭停下才開始；prefers-reduced-motion 或靜態事件（duration 0）直接在終點（t = Infinity）；
 * 動畫期間（以及 lingers 的事件留在這一步的期間）持續繪製，其餘時間不要求重繪。換步驟、換事件、鏡頭停下就重新開始。
 * 只呼叫一次（StageView），把回傳的 clock 傳給事件元件與需要的舞台。
 *
 * 重新開始是在 render 當中同步做的（不是 effect）：StageView 先 render、子元件後 render，
 * 所以換步驟的那一次 render，舞台與事件元件讀到的就已經是新的 t（例如 c-1 的 Infinity 不會被 c-2 的 strikeAt 看到）。
 */
export function useEventClock(spec: EventSpec | undefined): EventClock {
  const stepId = useTour((s) => currentStep(s).id)
  const [reduced] = useState(prefersReducedMotion)
  const invalidate = useThree((s) => s.invalidate)
  const duration = spec ? eventDuration(spec) : 0
  const lingers = spec ? eventLingers(spec) : false
  const instant = !spec || reduced || (duration <= 0 && !lingers)
  const revealed = useRevealAfterCamera(stepId, instant)
  const epoch = `${stepId}|${specKey(spec)}|${instant}|${revealed}`

  const start = spec && instant ? Infinity : null
  const t = useRef<number | null>(start)
  const t0 = useRef<number | null>(null)
  const epochRef = useRef(epoch)
  if (epochRef.current !== epoch) {
    // 冪等（同一個 epoch 只重設一次），StrictMode 重複 render 也安全
    epochRef.current = epoch
    t0.current = null
    t.current = start
  }
  /** 在哪個 epoch 走到終點（換 epoch 自動失效，不用另外重設） */
  const [doneAt, setDoneAt] = useState<string | null>(null)
  const done = (!!spec && instant) || doneAt === epoch
  const running = !!spec && !instant && revealed && (!done || lingers)

  // 重新開始後要一幀把新狀態畫出來（frameloop="demand"）
  useEffect(() => invalidate(), [epoch, invalidate])

  useContinuousRender(running)

  useFrame(({ clock }) => {
    if (!running) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const now = clock.elapsedTime - t0.current
    t.current = now
    if (!done && now > duration) {
      setDoneAt(epoch)
      if (!lingers) invalidate() // 最後一幀：例如閃電的光已退掉
    }
  }, CLOCK_PRIORITY)

  return useMemo(() => ({ spec, t, done, reduced, epoch }), [spec, done, reduced, epoch])
}

/**
 * 從事件時鐘讀出離散狀態（例如「打中了沒」「掃到幾個」）：值改變時才 re-render。
 * read 必須是純函式（t → 值）。第一次 render 與每次重新開始（clock.epoch 改變）都同步算出來，不會先用到舊的值。
 */
export function useEventValue<V>(clock: EventClock, read: (t: number | null) => V): V {
  const readRef = useRef(read)
  readRef.current = read
  const [state, setState] = useState(() => ({ epoch: clock.epoch, value: read(clock.t.current) }))
  // 換 epoch：在 render 當中立刻重算（React 的「依 props 調整 state」寫法），這一次 render 就用新值
  let current = state
  if (state.epoch !== clock.epoch) {
    current = { epoch: clock.epoch, value: read(clock.t.current) }
    setState(current)
  }
  const last = useRef(current)
  last.current = current
  useFrame(() => {
    const v = readRef.current(clock.t.current)
    if (!Object.is(v, last.current.value)) {
      last.current = { epoch: last.current.epoch, value: v }
      setState(last.current)
    }
  })
  return current.value
}

type DevWindow = { __BCI_EVENT_LOG__?: { what: string; at: number }[] }

/**
 * 開發／測試用：when 為 true 的每一次 commit（即使下一次 commit 就收回）記一筆到 window.__BCI_EVENT_LOG__，
 * e2e 用它確認事件的結果（例如「打中」）沒有比鏡頭停下更早出現過。正式版不做任何事。
 */
export function useDevEventLog(what: string, when: boolean) {
  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !when) return
    const w = window as unknown as DevWindow
    ;(w.__BCI_EVENT_LOG__ ??= []).push({ what, at: performance.now() })
  }, [what, when])
}
