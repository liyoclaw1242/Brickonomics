import { useEffect, useRef, useState } from 'react'
import type { Mark } from './marks'
import { T } from './strings'

export function MarkIcon({ kind }: { kind: Mark }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const m = T.marks[kind]
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])
  return (
    <span ref={ref} className={`mark mark--${kind}`}>
      <button type="button" className="mark__icon" aria-label={m.label} title={m.label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {m.icon}
      </button>
      {open && <span className="mark__tip" role="tooltip">{m.label}</span>}
    </span>
  )
}
