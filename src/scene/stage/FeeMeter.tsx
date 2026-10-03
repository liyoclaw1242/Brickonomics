import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { isVerified, universe } from '../../data'
import { useSandbox } from '../../store/sandbox'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'

const SECONDS_PER_YEAR = 6
const PRINCIPAL = 1_000_000

/** 塔上的計費表：時間快轉，顯示內扣費用累計磨掉的金額 */
export function FeeMeter() {
  const productId = useSandbox((s) => s.productId)
  const ready = useAfterFirstTick()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - start) / 1000), 200)
    return () => clearInterval(id)
  }, [productId])
  const product = productId ? universe.get(productId) : undefined
  const er = product?.fees?.expenseRatio
  if (!ready || !product || er === undefined) return null
  const years = elapsed / SECONDS_PER_YEAR
  const ground = PRINCIPAL * (1 - Math.pow(1 - er, years))
  const [x, , z] = EXCHANGE_POSITION
  return (
    <Html position={[x, 13, z]} center style={{ ...labelStyle, whiteSpace: 'normal', width: 220, textAlign: 'center', lineHeight: 1.5 }}>
      <strong>{T.feeMeter.title}</strong>
      <br />
      {T.feeMeter.rate(er)} {!isVerified(product, 'fees.expenseRatio') && <span className="badge">{T.unverified}</span>}
      <br />
      {T.feeMeter.ground(ground)}
      <br />
      <small>{T.feeMeter.note}</small>
    </Html>
  )
}
