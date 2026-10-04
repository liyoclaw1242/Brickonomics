import { universe } from '../../data'
import type { Asset } from '../../data/schema'
import { T } from '../../ui/strings'
import type { Vec3 } from '../camera'
import { CoinDrip } from '../CoinDrip'
import { Callout } from '../Callout'
import { BlockMaterial } from '../materials'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'

const SIZE = 2.4
const CORP: Asset = { id: 'CORP_DEMO', name: '', type: 'corpBond', asOf: '2026-10-03', source: [] }

type Slot = { key: 'stock' | 'gov' | 'corp' | 'hy'; asset: Asset; x: number; rate: number }
const SLOTS: Slot[] = [
  { key: 'stock', asset: universe.get('2330')!, x: -13, rate: 0 },
  { key: 'gov', asset: universe.get('US_TREASURY')!, x: -4.5, rate: 0.5 }, // 示意
  { key: 'corp', asset: CORP, x: 4, rate: 0.9 }, // 示意
  { key: 'hy', asset: universe.get('US_HIGH_YIELD')!, x: 12.5, rate: 1.5 }, // 示意
]

/** 國家債 #d8f3ff 在白底上太淡：這個舞台局部改用較飽和的冰青色（不動共用的 palette） */
const BOND_COLOR: Partial<Record<Slot['key'], string>> = { gov: '#5fd4ee', corp: '#78909c', hy: '#ffb300' }

/** 股票方塊 vs 三種借據：材質表示信用品質，金幣快慢表示利息（示意） */
export function BondShowcase({ stressed, quality }: { stressed: boolean; quality: Quality }) {
  return (
    <>
      {SLOTS.map((s) => {
        const look = lookFor(s.asset)
        const scaleY = stressed && s.key === 'stock' ? 0.45 : 1
        const tilt = stressed && s.key === 'hy' ? 0.25 : 0
        const top: Vec3 = atPlaza(s.x, SIZE * scaleY, 0)
        const pile: Vec3 = atPlaza(s.x + 2.4, 0.1, 0)
        const dripping = s.rate > 0 && !(stressed && s.key === 'hy')
        return (
          <group key={s.key}>
            <mesh position={atPlaza(s.x, (SIZE * scaleY) / 2, 0)} scale={[1, scaleY, 1]} rotation-z={tilt} castShadow>
              <boxGeometry args={[SIZE, SIZE, SIZE]} />
              {s.key === 'stock' ? (
                <meshStandardMaterial color={stressed ? '#c0392b' : look.color} />
              ) : (
                <BlockMaterial
                  kind={look.kind}
                  quality={quality}
                  color={BOND_COLOR[s.key] ?? look.color}
                  opacity={stressed && s.key === 'hy' ? 0.35 : 1}
                />
              )}
            </mesh>
            {dripping && <CoinDrip from={top} to={pile} rate={s.rate} />}
            <Callout
              anchor={atPlaza(s.x, 0.1, SIZE / 2)}
              offset={[0, -0.3, 1.4]}
              title={T.stage.bonds[s.key]}
              mark={s.key !== 'stock' || stressed ? 'illustrative' : undefined}
            />
          </group>
        )
      })}
    </>
  )
}
