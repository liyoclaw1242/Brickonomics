import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { universe } from '../../data'
import { useSandbox } from '../../store/sandbox'
import { T } from '../../ui/strings'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'
import type { Vec3 } from '../camera'

const SECONDS_PER_YEAR = 6
const PRINCIPAL = 1_000_000

/**
 * 塔上的計費表：時間快轉，顯示內扣費用累計磨掉的金額。
 * 預設讀交易所那檔基金（sandbox productId）的內扣費用；實戰課直接給 rate（每年，小數）與位置 at。
 */
export function FeeMeter({ rate, at }: { rate?: number; at?: Vec3 } = {}) {
  const productId = useSandbox((s) => s.productId)
  const ready = useAfterFirstTick()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(0)
    const start = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - start) / 1000), 200)
    return () => clearInterval(id)
  }, [productId, rate])
  const product = productId ? universe.get(productId) : undefined
  const er = rate ?? product?.fees?.expenseRatio
  if (!ready || er === undefined || (rate === undefined && !product)) return null
  const years = elapsed / SECONDS_PER_YEAR
  const ground = PRINCIPAL * (1 - Math.pow(1 - er, years))
  const [x, , z] = EXCHANGE_POSITION
  return (
    // 費率本身已是面板的大數字，這裡只留計費表在跑的結果（少字）；放在台座前緣，手機上不會壓到時間軸
    <Html position={at ?? [x, 1.2, z + 9]} center className="callout callout--wrap">
      <span className="callout__title">
        {T.feeMeter.title}・{T.feeMeter.elapsed(Math.floor(years) + 1)}
      </span>
      <span>
        {/* 費率沒查證時的 ？ 標在面板標題旁（stepMarks），這裡不重複 */}
        {T.feeMeter.ground(ground)}
      </span>
      {/* 投入金額和其他基金步驟同一個底（100 萬）；快轉的說明併進同一行小字（r6：獨立一行看不懂） */}
      <span className="callout__sub callout__sub--min13">{T.feeMeter.base}・{T.feeMeter.fastForward}</span>
    </Html>
  )
}
