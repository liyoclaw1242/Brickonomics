import { Html } from '@react-three/drei'
import { T } from '../../ui/strings'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { blocksFor } from '../layout/stages'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

export type TowerSpec = { key: string; label: string; value: number; lost?: number; coins?: number; color: string; unverified?: boolean }

const SPACING = 14
const LOST = { color: '#e53935', kind: 'matte' as const }

/** 一排方塊塔：塔＝剩下的價值；紅色小堆＝被費用吃掉；金幣堆＝領到的錢（皆 2 元一顆） */
export function TowerRow({ towers, quality }: { towers: TowerSpec[]; quality: Quality }) {
  const ready = useAfterFirstTick()
  const start = -((towers.length - 1) * SPACING) / 2
  return (
    <>
      {towers.map((t, i) => {
        const x = start + i * SPACING
        return (
          <group key={t.key}>
            <VoxelColumn count={blocksFor(t.value)} look={{ color: t.color, kind: 'matte' }} position={atPlaza(x, 0, 0)} quality={quality} />
            {t.lost !== undefined && t.lost > 0 && (
              <VoxelColumn count={blocksFor(t.lost)} look={LOST} position={atPlaza(x + 4.5, 0, 0)} w={3} d={3} quality={quality} />
            )}
            {t.coins !== undefined && <CoinPile count={blocksFor(t.coins)} position={atPlaza(x - 5.5, 0, 0)} />}
            {ready && (
              <Html position={atPlaza(x, -0.2, 4.2)} center style={labelStyle}>
                {t.label}：{T.towers.value(t.value)}
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}
