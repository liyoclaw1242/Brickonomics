import { useEffect, useMemo } from 'react'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { formatPct, pickInfo, sourceLabel } from './model'
import { MarkIcon } from './MarkIcon'
import { T } from './strings'

export function PickInfoPanel() {
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  const info = useMemo(() => pickInfo(universe, picked), [picked])
  useEffect(() => {
    if (!picked) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && pick(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, pick])
  if (!info) return null
  return (
    <div className="info" role="region" aria-live="polite" aria-label={info.title}>
      <button className="info__close" aria-label={T.close} onClick={() => pick(null)}>
        {T.closeGlyph}
      </button>
      <h2>{info.title}</h2>
      {info.subtitle && <p className="info__sub">{info.subtitle}</p>}
      {info.weightPct !== null && (
        <p>
          {T.weight}：<strong>{formatPct(info.weightPct)}</strong>
        </p>
      )}
      <p>
        {T.asOf}：{info.asOf} {!info.verified && <MarkIcon kind="unverified" />}
      </p>
      {info.aggregate && <p className="hint">{T.aggregateNote}</p>}
      {info.sources.length > 0 && (
        <p className="info__src">
          {T.source}：
          {info.sources.map((s) => {
            const l = sourceLabel(s)
            return l.href ? (
              <a key={s} href={l.href} target="_blank" rel="noreferrer">
                {l.text}
              </a>
            ) : (
              <span key={s}>{l.text}</span>
            )
          })}
        </p>
      )}
    </div>
  )
}
