import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

/** 文字輸入類元素：空白鍵一律留給輸入 */
export const TEXT_ENTRY =
  'textarea,select,[contenteditable=""],[contenteditable="true"],input:not([type=range]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=reset])'
const ACTIVATABLE = 'button,a,input[type=button],input[type=checkbox],input[type=radio],input[type=submit],input[type=reset]'

const matchesFocusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible')
  } catch {
    return false
  }
}

/**
 * 空白鍵要不要拿來「拆開」：
 * - 文字輸入、選單（[role=menu]）：永遠不攔截。
 * - 按鈕、連結：鍵盤聚焦時保留原本作用（按下）；滑鼠點過的不保留。
 *   光靠 :focus-visible 不夠（Chromium 在 Space keydown 當下會切成鍵盤模式），所以呼叫端另外傳入「最近一次操作是否為滑鼠」。
 */
export function spaceExplodes(target: EventTarget | null, pointerModality: boolean): boolean {
  if (!(target instanceof Element)) return true
  if (target.closest(TEXT_ENTRY)) return false
  // 選單（例如換階）：空白鍵是選取，永遠不拿來拆開
  if (target.closest('[role=menu]')) return false
  const act = target.closest(ACTIVATABLE)
  if (act && !pointerModality && matchesFocusVisible(act)) return false
  return true
}

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    let pointerModality = false
    const onPointer = () => {
      pointerModality = true
    }
    const onAnyKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') pointerModality = false
    }
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !spaceExplodes(e.target, pointerModality)) return
      e.preventDefault()
      if (held && e.repeat) return
      setHeld(held)
    }
    const down = onKey(true)
    const up = onKey(false)
    const blur = () => setHeld(false)
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onAnyKey, true)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onAnyKey, true)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [setHeld])
}
