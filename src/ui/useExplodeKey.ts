import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && t.type !== 'range')

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return
      e.preventDefault()
      setHeld(held)
    }
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
    }
  }, [setHeld])
}
