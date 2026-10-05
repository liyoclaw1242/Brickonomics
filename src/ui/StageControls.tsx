import { useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { controlRange } from '../tour/engine'
import type { Control, ValueKey } from '../tour/types'
import { MarkIcon } from './MarkIcon'
import { T } from './strings'

const STEP: Record<ValueKey, number> = { years: 0.5, periods: 1, phase: 0.01, frontLoad: 0.0025, tick: 1, rate: 0.001, months: 1, bondPct: 10, trades: 10, hedgeCase: 1, rebal: 1, storm: 1, feeDiscount: 0.02, winRate: 0.01 }

function ValueSlider({ k }: { k: ValueKey }) {
  const v = useTour((s) => s.values[k])
  const setValue = useTour((s) => s.setValue)
  const [lo, hi] = useTour((s) => controlRange(currentStep(s), k))
  const fmt = { years: T.controls.yearsValue, periods: T.controls.periodsValue, phase: T.controls.phaseValue, frontLoad: T.controls.frontLoadValue, tick: T.controls.tickValue, rate: T.controls.rateValue, months: T.controls.monthsValue, bondPct: T.controls.bondPctValue, trades: T.controls.tradesValue, hedgeCase: T.controls.hedgeCaseValue, rebal: T.controls.rebalValue, storm: T.controls.stormValue, feeDiscount: T.controls.feeDiscountValue, winRate: T.controls.winRateValue }[k]
  return (
    <label className="control">
      <span className="control__label">
        {T.controls[k]}
        {k === 'frontLoad' && <MarkIcon kind="assumption" />}
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
  // 每一步可以縮小拉桿範圍（例如 e-2 的雷射刀不切到底，免得整顆消失）
  const sliceMax = useTour((s) => controlRange(currentStep(s), 'slice')[1])
  const explodeMax = useTour((s) => controlRange(currentStep(s), 'explode')[1])
  return (
    <div className="controls">
      {controls.map((c) => {
        if (c === 'slice')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.slice}</span>
              <input type="range" min={0} max={sliceMax} step={0.01} value={Math.min(slice, sliceMax)} onChange={(e) => setSlice(Math.min(sliceMax, Number(e.target.value)))} />
            </label>
          )
        if (c === 'explode')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.explode}</span>
              <input type="range" min={0} max={explodeMax} step={0.01} value={Math.min(explode, explodeMax)} onChange={(e) => setExplode(Math.min(explodeMax, Number(e.target.value)))} />
            </label>
          )
        return <ValueSlider key={c} k={c} />
      })}
    </div>
  )
}
