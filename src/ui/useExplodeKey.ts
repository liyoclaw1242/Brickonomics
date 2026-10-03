import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

const INTERACTIVE = 'button,a,select,textarea,input:not([type=range])'
const isInteractive = (t: EventTarget | null) => !!(t as Element | null)?.closest?.(INTERACTIVE)

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isInteractive(e.target)) return
      if (held && e.repeat) {
        e.preventDefault()
        return
      }
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
