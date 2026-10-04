import { useState } from 'react'
import type { Mark } from './marks'
import { T } from './strings'

export function MarkIcon({ kind }: { kind: Mark }) {
  const [open, setOpen] = useState(false)
  const m = T.marks[kind]
  return (
    <span className={`mark mark--${kind}`}>
      <button type="button" className="mark__icon" aria-label={m.label} title={m.label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {m.icon}
      </button>
      {open && <span className="mark__tip" role="tooltip">{m.label}</span>}
    </span>
  )
}
