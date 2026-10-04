import { useMemo } from 'react'
import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { SHOCK_2330, signedPct } from '../../tour/context'
import { displayName } from '../../ui/names'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { Callout } from '../Callout'
import { damageFromShocks } from '../layout/stages'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

const DAMAGE = damageFromShocks(SHOCK_2330)
const STOCK_BLOCKS = 40 // 2×2×10 的台積電柱
const SUBJECTS = [
  { key: 'stock', x: -14 },
  { key: '0050', x: 0 },
  { key: 'SPY', x: 14 },
] as const

/** 假設台積電下跌 30%：只買台積電、0050、SPY 並排比較 */
export function ShockStage({ active, quality }: { active: boolean; quality: Quality }) {
  const damage = useMemo(() => (active ? DAMAGE : undefined), [active])
  const look = useMemo(() => lookFor(universe.get('2330')!), [])
  const stockCount = active ? Math.round(STOCK_BLOCKS * (1 - DAMAGE['2330']!)) : STOCK_BLOCKS
  return (
    <>
      <VoxelColumn count={stockCount} look={look} position={atPlaza(SUBJECTS[0].x, 0, 0)} w={2} d={2} quality={quality} />
      <Basket productId="0050" quality="low" position={atPlaza(SUBJECTS[1].x, 0, 0)} slice={0} sliceAxis="x" explode={0} damage={damage} />
      <Basket productId="SPY" quality="low" position={atPlaza(SUBJECTS[2].x, 0, 0)} slice={0} sliceAxis="x" explode={0} />
      {SUBJECTS.map((s) => {
        const name = s.key === 'stock' ? T.shock.stock : displayName(universe, s.key)
        const pct = active ? signedPct(s.key === 'stock' ? SHOCK_2330['2330']! : shockImpact(universe, s.key, { ...SHOCK_2330 })) : ''
        return (
          <Callout
            key={s.key}
            anchor={atPlaza(s.x, 0.1, 4)}
            offset={[0, -0.3, 3]}
            // 衝擊後：跌幅當標題、名稱當副標（字塊窄，手機上三個並排不會互撞或超出畫面）
            title={active ? pct : name}
            // 圖例（紅色＝假設跌掉的部分）併進中間那籃的副標
            sub={active ? (s.key === '0050' ? T.shock.withLegend(name) : name) : undefined}
            // 衝擊發生後，帶圖例的那一籃屬於內容（關掉「標註」也留著）；三籃的跌幅都是內容
            persistent={active}
          />
        )
      })}
    </>
  )
}
