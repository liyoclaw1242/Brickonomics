import { useEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { LONG_PRESS_MS, PressTracker } from '../ui/press'

/** 手機長按：回傳 R3F pointer handlers；只對觸控生效 */
export function useLongPress(onLong: (e: ThreeEvent<PointerEvent>) => void) {
  const cb = useRef(onLong)
  cb.current = onLong
  const tracker = useMemo(() => new PressTracker(), [])
  const activeId = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return useMemo(
    () => ({
      onPointerDown: (e: ThreeEvent<PointerEvent>) => {
        if (e.pointerType !== 'touch' || !e.isPrimary) return
        e.stopPropagation() // 只讓最近的物件處理，不要穿透到後面的物件
        if (activeId.current === e.pointerId) return
        activeId.current = e.pointerId
        tracker.start(e.clientX, e.clientY)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          if (tracker.canFire()) cb.current(e)
          tracker.end()
          activeId.current = null
        }, LONG_PRESS_MS)
      },
      onPointerMove: (e: ThreeEvent<PointerEvent>) => tracker.move(e.clientX, e.clientY),
      onPointerUp: () => {
        activeId.current = null
        tracker.end()
        clearTimeout(timer.current)
      },
      onPointerLeave: () => {
        activeId.current = null
        tracker.end()
        clearTimeout(timer.current)
      },
    }),
    [tracker],
  )
}
