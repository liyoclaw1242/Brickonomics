import { useEffect, useState } from 'react'

/** 鏡頭一直沒停下（例如被擋住）也要在這之後顯示文字，避免卡住 */
const REVEAL_FALLBACK_MS = 1500

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 3b1b「先看再命名」：換步驟後等鏡頭停下（body data-camera-settled / data-camera-seq）才顯示文字。
 * 鏡頭的啟動可能比這個 effect 早或晚，所以先確認看到「這次」的移動（settled=false 或 seq 改變），再等它變回 true。
 */
export function useRevealAfterCamera(stepId: string, instant: boolean): boolean {
  const [revealed, setRevealed] = useState<{ id: string; on: boolean }>({ id: stepId, on: instant })
  useEffect(() => {
    if (instant) {
      setRevealed({ id: stepId, on: true })
      return
    }
    setRevealed({ id: stepId, on: false })
    const body = document.body
    const seq0 = body.dataset.cameraSeq
    let started = body.dataset.cameraSettled === 'false'
    const show = () => setRevealed({ id: stepId, on: true })
    const check = () => {
      if (body.dataset.cameraSettled === 'false' || body.dataset.cameraSeq !== seq0) started = true
      if (started && body.dataset.cameraSettled === 'true') show()
    }
    const mo = new MutationObserver(check)
    mo.observe(body, { attributes: true, attributeFilter: ['data-camera-settled', 'data-camera-seq'] })
    const timer = window.setTimeout(show, REVEAL_FALLBACK_MS)
    return () => {
      mo.disconnect()
      window.clearTimeout(timer)
    }
  }, [stepId, instant])
  // 換步驟的第一次 render（effect 尚未執行）也要立刻藏起來
  return revealed.id === stepId && revealed.on
}
