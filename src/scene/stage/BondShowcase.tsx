import { universe } from '../../data'
import type { Asset } from '../../data/schema'
import { T } from '../../ui/strings'
import type { Vec3 } from '../camera'
import { CoinDrip } from '../CoinDrip'
import { Callout } from '../Callout'
import { BlockMaterial } from '../materials'
import { ACCENT_COLORS, lookFor } from '../palette'
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

const HALF = SIZE / 2
/** 裂開的高收益債：左右兩半各往外倒、中間留一道縫 */
const CRACK_TILT = 0.32
const CRACK_GAP = 0.35

function CrackedBond({ x }: { x: number }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={atPlaza(x + side * (HALF / 2 + CRACK_GAP), SIZE / 2, 0)}
          rotation-z={-side * CRACK_TILT}
          castShadow
        >
          <boxGeometry args={[HALF, SIZE, SIZE]} />
          <meshStandardMaterial color={ACCENT_COLORS.loss} roughness={0.6} />
        </mesh>
      ))}
    </>
  )
}

/**
 * 股票方塊 vs 三種借據：材質表示信用品質，金幣快慢表示利息（示意）。
 * ranks：每張借據的標籤下面寫「穩不穩、利息多少」（b-2，三顆長得很像，要用字分出來）。
 * stressed：經濟風暴，股票縮水變紅，高收益債裂成兩半、變紅、停付利息（b-3）。
 */
export function BondShowcase({ stressed, ranks = false, quality }: { stressed: boolean; ranks?: boolean; quality: Quality }) {
  return (
    <>
      {SLOTS.map((s) => {
        const look = lookFor(s.asset)
        const scaleY = stressed && s.key === 'stock' ? 0.45 : 1
        const broken = stressed && s.key === 'hy'
        const top: Vec3 = atPlaza(s.x, SIZE * scaleY, 0)
        const pile: Vec3 = atPlaza(s.x + 2.4, 0.1, 0)
        const dripping = s.rate > 0 && !broken
        const rank = ranks && s.key !== 'stock' ? T.stage.bondRanks[s.key] : undefined
        return (
          <group key={s.key}>
            {broken ? (
              <CrackedBond x={s.x} />
            ) : (
              <mesh position={atPlaza(s.x, (SIZE * scaleY) / 2, 0)} scale={[1, scaleY, 1]} castShadow>
                <boxGeometry args={[SIZE, SIZE, SIZE]} />
                {s.key === 'stock' ? (
                  <meshStandardMaterial color={stressed ? ACCENT_COLORS.loss : look.color} />
                ) : (
                  <BlockMaterial kind={look.kind} quality={quality} color={BOND_COLOR[s.key] ?? look.color} />
                )}
              </mesh>
            )}
            {dripping && <CoinDrip from={top} to={pile} rate={s.rate} />}
            <Callout
              anchor={atPlaza(s.x, 0.1, SIZE / 2)}
              offset={[0, -0.3, 1.4]}
              title={broken ? T.stage.bondHurt(T.stage.bonds.hy) : T.stage.bonds[s.key]}
              sub={rank}
              color={broken ? ACCENT_COLORS.loss : undefined}
              persistent={s.key !== 'stock' || stressed}
            />
          </group>
        )
      })}
    </>
  )
}
