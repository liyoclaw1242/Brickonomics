import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { SHOCK_2330, signedPct } from '../../tour/context'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { labelStyle } from '../labelStyle'
import { damageFromShocks } from '../layout/stages'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
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
  const ready = useAfterFirstTick()
  const damage = useMemo(() => (active ? DAMAGE : undefined), [active])
  const look = useMemo(() => lookFor(universe.get('2330')!), [])
  const stockCount = active ? Math.round(STOCK_BLOCKS * (1 - DAMAGE['2330']!)) : STOCK_BLOCKS
  return (
    <>
      <VoxelColumn count={stockCount} look={look} position={atPlaza(SUBJECTS[0].x, 0, 0)} w={2} d={2} quality={quality} />
      <Basket productId="0050" quality="low" position={atPlaza(SUBJECTS[1].x, 0, 0)} slice={0} sliceAxis="x" explode={0} damage={damage} />
      <Basket productId="SPY" quality="low" position={atPlaza(SUBJECTS[2].x, 0, 0)} slice={0} sliceAxis="x" explode={0} />
      {ready &&
        SUBJECTS.map((s) => {
          const name = s.key === 'stock' ? T.shock.stock : universe.get(s.key)!.name
          const pct = active ? signedPct(s.key === 'stock' ? SHOCK_2330['2330']! : shockImpact(universe, s.key, { ...SHOCK_2330 })) : ''
          return (
            <Html key={s.key} position={atPlaza(s.x, -0.2, 7)} center style={labelStyle}>
              {active ? T.shock.label(name, pct) : name}
            </Html>
          )
        })}
      {ready && active && (
        <Html position={atPlaza(SUBJECTS[1].x, -0.2, 8.6)} center style={labelStyle}>
          {T.shock.legend}
        </Html>
      )}
    </>
  )
}
