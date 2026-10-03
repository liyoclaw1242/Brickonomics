import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { illustrativeTicks } from '../layout/stages'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'

const TICKS = illustrativeTicks(50, 600)

/** 交易所櫃台上的示意成交價（每秒跳動）與基金淨值說明 */
export function PriceTicker() {
  const ready = useAfterFirstTick()
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!ready) return null
  const last = TICKS.length - 1
  const at = (n: number) => {
    const m = n % (2 * last)
    return m <= last ? m : 2 * last - m
  }
  const p = TICKS[at(step)]!
  const prev = step > 0 ? TICKS[at(step - 1)]! : p
  const color = p > prev ? '#c62828' : p < prev ? '#2e7d32' : 'inherit'
  const [x, , z] = EXCHANGE_POSITION
  return (
    <Html position={[x, 13, z]} center style={{ ...labelStyle, fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
      {T.ticker.etf} <strong style={{ color }}>{p.toFixed(2)}</strong>
      <br />
      <small>{T.ticker.fund}</small>
    </Html>
  )
}
