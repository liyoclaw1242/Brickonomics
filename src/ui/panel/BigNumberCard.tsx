import { useEffect, useState } from 'react'
import type { BigNumber, Mark } from '../../tour/types'
import { countUp, easeOut } from '../countUp'
import { MarkIcon } from '../MarkIcon'

const DURATION_MS = 600

/**
 * 大數字卡。run 變成 true 後用 requestAnimationFrame 在 600ms 內從 0 長到目標（色條同步）；
 * instant（prefers-reduced-motion）時直接顯示最終值。換步驟時由父層用 key 重新掛載以重跑。
 * 動畫中的數字對螢幕閱讀器隱藏，改讀最終值。
 */
/** titleMarks：標題旁已經有的標示，卡片上不重複；delayMs：run 之後再等多久才開始數 */
export function BigNumberCard({ n, color, run, instant, titleMarks = [], delayMs = 0 }: { n: BigNumber; color?: string; run: boolean; instant: boolean; titleMarks?: readonly Mark[]; delayMs?: number }) {
  const [t, setT] = useState(instant ? 1 : 0)
  useEffect(() => {
    if (!run || instant) {
      if (instant) setT(1)
      return
    }
    let raf = 0
    // delayMs：等場景裡的事件（例如閃電打中）才開始數
    const start = performance.now() + delayMs
    const tick = (now: number) => {
      const x = Math.min(1, Math.max(0, (now - start) / DURATION_MS))
      setT(x)
      if (x < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, instant, delayMs])

  const fraction = n.fraction === undefined ? undefined : Math.max(0, Math.min(1, n.fraction)) * easeOut(t)
  return (
    <div className="bignum">
      <div className="bignum__value">
        <span aria-hidden="true">{countUp(n.value, t)}</span>
        <span className="sr-only">{n.value}</span>
        {n.mark && !titleMarks.includes(n.mark) && <MarkIcon kind={n.mark} />}
      </div>
      <div className="bignum__label">{n.label}</div>
      {n.note && <div className="bignum__note">{n.note}</div>}
      {fraction !== undefined && (
        <div className="bignum__bar" aria-hidden="true">
          <span style={{ width: `${fraction * 100}%`, background: color }} />
        </div>
      )}
    </div>
  )
}
