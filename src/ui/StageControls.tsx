import { useSandbox } from '../store/sandbox'
import { useTour, VALUE_RANGES } from '../store/tour'
import type { Control, ValueKey } from '../tour/types'
import { T } from './strings'

const STEP: Record<ValueKey, number> = { years: 0.5, periods: 1, phase: 0.01, frontLoad: 0.0025 }

function ValueSlider({ k }: { k: ValueKey }) {
  const v = useTour((s) => s.values[k])
  const setValue = useTour((s) => s.setValue)
  const [lo, hi] = VALUE_RANGES[k]
  const fmt = { years: T.controls.yearsValue, periods: T.controls.periodsValue, phase: T.controls.phaseValue, frontLoad: T.controls.frontLoadValue }[k]
  return (
    <label className="control">
      <span className="control__label">
        {T.controls[k]}
        {k === 'frontLoad' && <span className="badge">{T.assumption}</span>}
        <span className="control__value">{fmt(v)}</span>
      </span>
      <input type="range" min={lo} max={hi} step={STEP[k]} value={v} onChange={(e) => setValue(k, Number(e.target.value))} />
    </label>
  )
}

export function StageControls({ controls }: { controls: readonly Control[] }) {
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox((s) => s.explode)
  const { setSlice, setExplode } = useSandbox.getState()
  return (
    <div className="controls">
      {controls.map((c) => {
        if (c === 'slice')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.slice}</span>
              <input type="range" min={0} max={1} step={0.01} value={slice} onChange={(e) => setSlice(Number(e.target.value))} />
            </label>
          )
        if (c === 'explode')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.explode}</span>
              <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
            </label>
          )
        return <ValueSlider key={c} k={c} />
      })}
    </div>
  )
}
