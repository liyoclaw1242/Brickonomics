import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

const INTERACTIVE = 'button,a,select,textarea,input:not([type=range])'
/**
 * 只有「鍵盤聚焦」的互動元件才保留空白鍵原本的作用（按下按鈕）；滑鼠點過的按鈕不攔截。
 * 光靠 :focus-visible 不夠：Chromium 在 Space keydown 當下會切成鍵盤模式，滑鼠點過的按鈕也會匹配，
 * 所以另外記錄最近一次操作是滑鼠（pointerdown）還是其他按鍵（Tab、方向鍵…）。
 */
let pointerModality = false
const isKeyboardFocused = (t: EventTarget | null) => {
  if (pointerModality) return false
  const el = (t as Element | null)?.closest?.(INTERACTIVE)
  return !!el && el.matches(':focus-visible')
}

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isKeyboardFocused(e.target)) return
      if (held && e.repeat) {
        e.preventDefault()
        return
      }
      e.preventDefault()
      setHeld(held)
    }
    const onPointer = () => {
      pointerModality = true
    }
    const onAnyKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') pointerModality = false
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onAnyKey, true)
    const down = onKey(true)
    const up = onKey(false)
    const blur = () => setHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onAnyKey, true)
    }
  }, [setHeld])
}
