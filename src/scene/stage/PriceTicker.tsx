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
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TICKS.length), 1000)
    return () => clearInterval(id)
  }, [])
  if (!ready) return null
  const p = TICKS[i]!
  const up = i > 0 && p >= TICKS[i - 1]!
  const [x, , z] = EXCHANGE_POSITION
  return (
    <Html position={[x, 13, z]} center style={{ ...labelStyle, fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
      {T.ticker.etf} <strong style={{ color: up ? '#c62828' : '#2e7d32' }}>{p.toFixed(2)}</strong>
      <br />
      <small>{T.ticker.fund}</small>
    </Html>
  )
}
