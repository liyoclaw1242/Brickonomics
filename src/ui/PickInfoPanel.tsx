import { useMemo } from 'react'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { formatPct, pickInfo } from './model'
import { T } from './strings'

export function PickInfoPanel() {
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  const info = useMemo(() => pickInfo(universe, picked), [picked])
  if (!info) return null
  return (
    <div className="info" role="dialog" aria-label={info.title}>
      <button className="info__close" aria-label={T.close} onClick={() => pick(null)}>
        ×
      </button>
      <h2>{info.title}</h2>
      {info.subtitle && <p className="info__sub">{info.subtitle}</p>}
      {info.weightPct !== null && (
        <p>
          {T.weight}：<strong>{formatPct(info.weightPct)}</strong>
        </p>
      )}
      <p>
        {T.asOf}：{info.asOf} {!info.verified && <span className="badge">{T.unverified}</span>}
      </p>
      {info.aggregate && <p className="hint">{T.aggregateNote}</p>}
      {info.sources.length > 0 && (
        <p className="info__src">
          {T.source}：
          {info.sources.map((s) =>
            s.startsWith('http') ? (
              <a key={s} href={s} target="_blank" rel="noreferrer">
                {new URL(s).hostname}
              </a>
            ) : (
              <span key={s}>{s}</span>
            ),
          )}
        </p>
      )}
    </div>
  )
}
