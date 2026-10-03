import { useMemo } from 'react'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { useTour } from '../store/tour'
import { formatPct, legendMeta, legendRows, productGroups } from './model'
import { T } from './strings'

export function SandboxPanel() {
  const { etfs, funds } = useMemo(() => productGroups(universe), [])
  const productId = useSandbox((s) => s.productId)
  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox((s) => s.explode)
  const { selectProduct, setSliceAxis, setSlice, setExplode, pick } = useSandbox.getState()
  const rows = useMemo(() => (productId ? legendRows(universe, productId) : []), [productId])
  const meta = useMemo(() => (productId ? legendMeta(universe, productId) : null), [productId])

  const chip = (id: string, name: string) => (
    <button key={id} className="chip" aria-pressed={id === productId} onClick={() => selectProduct(id)}>
      {name}
    </button>
  )

  return (
    <aside className="panel">
      <h1 className="panel__title">{T.appTitle}</h1>
      <button className="link" onClick={() => useTour.getState().restartTour()}>
        {T.replayTour}
      </button>

      <section>
        <h2>{T.products}</h2>
        <h3>{T.etfs}</h3>
        <div className="chips">{etfs.map((a) => chip(a.id, a.name))}</div>
        <h3>{T.funds}</h3>
        <div className="chips">{funds.map((a) => chip(a.id, a.name))}</div>
      </section>

      <section>
        <h2>{T.slice}</h2>
        <div className="seg" role="group" aria-label={T.slice}>
          {(['x', 'z', 'y', 'd'] as const).map((ax) => (
            <button key={ax} aria-pressed={ax === sliceAxis} onClick={() => setSliceAxis(ax)}>
              {T.sliceAxis[ax]}
            </button>
          ))}
        </div>
        <input type="range" min={0} max={1} step={0.01} value={slice} aria-label={T.sliceAmount} onChange={(e) => setSlice(Number(e.target.value))} />
      </section>

      <section>
        <h2>{T.explode}</h2>
        <input type="range" min={0} max={1} step={0.01} value={explode} aria-label={T.explodeAmount} onChange={(e) => setExplode(Number(e.target.value))} />
        <p className="hint">{T.explodeHint}</p>
      </section>

      {productId && (
        <section>
          <h2>{T.legend}</h2>
          {meta && (
            <p className="hint">
              {T.asOf}：{meta.asOf} {!meta.verified && <span className="badge">{T.unverified}</span>}
            </p>
          )}
          <ul className="legend">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => pick({ productId, holdingId: r.id })}>
                  <span className="swatch" style={{ background: r.color }} />
                  <span className={r.aggregate ? 'legend__name legend__name--aggregate' : 'legend__name'} title={r.aggregate ? T.aggregateNote : undefined}>
                    {r.name}
                  </span>
                  <span className="legend__pct">{formatPct(r.weightPct)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="hint">{T.heightNote}</p>
    </aside>
  )
}
