import { useMemo } from 'react'
import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { movePct, SHOCK_2330 } from '../../tour/context'
import { displayName } from '../../ui/names'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { Callout } from '../Callout'
import { strikeAt } from '../events/lightning'
import { SHOCK_DAMAGE, SHOCK_SUBJECTS, STOCK_BLOCKS, STOCK_W, stockBlocksAfter } from '../events/lightningBolt'
import type { EventClock } from '../events/types'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { useDevEventLog, useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

/**
 * 假設台積電下跌 30%：只買台積電、0050、SPY 並排比較。烏雲與閃電是步驟的 scene.event（lightning；events/Lightning.tsx）：
 * c-1 gather 只有烏雲；c-2 strike 鏡頭停下後一道閃電只分岔到台積電——只買台積電那柱、0050 裡的台積電層；SPY 沒有台積電，沒被打到。
 * 這個舞台只讀同一個事件時鐘（strikeAt）：打中那一刻才出現損傷（柱子變矮、0050 的紅色方塊）和跌幅標籤；終點與原本靜態的畫面一樣。
 */
export function ShockStage({ quality, event }: { quality: Quality; event: EventClock }) {
  const hit = useEventValue(event, (t) => strikeAt(event.spec, t))
  useDevEventLog('shock-damage', hit)
  const damage = useMemo(() => (hit ? SHOCK_DAMAGE : undefined), [hit])
  const look = useMemo(() => lookFor(universe.get('2330')!), [])
  const stockCount = hit ? stockBlocksAfter : STOCK_BLOCKS
  return (
    <>
      <VoxelColumn count={stockCount} look={look} position={atPlaza(SHOCK_SUBJECTS[0]!.x, 0, 0)} w={STOCK_W} d={STOCK_W} quality={quality} />
      <Basket productId="0050" quality="low" position={atPlaza(SHOCK_SUBJECTS[1]!.x, 0, 0)} slice={0} sliceAxis="x" explode={0} damage={damage} />
      <Basket productId="SPY" quality="low" position={atPlaza(SHOCK_SUBJECTS[2]!.x, 0, 0)} slice={0} sliceAxis="x" explode={0} />
      {SHOCK_SUBJECTS.map((s) => {
        const name = s.key === 'stock' ? T.shock.stock : displayName(universe, s.key)
        const pct = hit ? movePct(s.key === 'stock' ? SHOCK_2330['2330']! : shockImpact(universe, s.key, { ...SHOCK_2330 })) : ''
        return (
          <Callout
            key={s.key}
            anchor={atPlaza(s.x, 0.1, 4)}
            offset={[0, -0.3, 3]}
            // 衝擊後：跌幅當標題（用字說「跌 16.9%」，負號太細，r3）、名稱當副標（字塊窄，手機上三個並排不會互撞或超出畫面）
            title={hit ? pct : name}
            // 圖例（紅色＝假設跌掉的部分）併進中間那籃的副標
            sub={hit ? (s.key === '0050' ? T.shock.withLegend(name) : name) : undefined}
            // 衝擊發生後，帶圖例的那一籃屬於內容（關掉「標註」也留著）；三籃的跌幅都是內容
            persistent={hit}
          />
        )
      })}
    </>
  )
}
