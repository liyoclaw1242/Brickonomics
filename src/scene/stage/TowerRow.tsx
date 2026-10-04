import type { Mark } from '../../ui/marks'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { CoinPile } from '../CoinPile'
import { blocksFor } from '../layout/stages'
import type { BlockLook } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

export type TowerSpec = { key: string; label: string; value: number; lost?: number; coins?: number; color: string; mark?: Mark }

const SPACING = 12
const looks = new Map<string, BlockLook>()
/** 同一個顏色永遠回傳同一個 look 物件，避免子元件的 memo 每次 render 都失效 */
const matteLook = (color: string): BlockLook => {
  let l = looks.get(color)
  if (!l) looks.set(color, (l = { color, kind: 'matte' }))
  return l
}
const LOST = { color: '#e53935', kind: 'matte' as const }

/** 一排方塊塔：塔＝剩下的價值；紅色小堆＝被費用吃掉；金幣堆＝領到的錢（皆 2 元一顆） */
export function TowerRow({ towers, quality }: { towers: TowerSpec[]; quality: Quality }) {
  const start = -((towers.length - 1) * SPACING) / 2
  return (
    <>
      <Callout anchor={atPlaza(0, -0.2, 14)} offset={[0, 0, 0]} title={T.towers.base} />
      {towers.map((t, i) => {
        const x = start + i * SPACING
        return (
          <group key={t.key}>
            <VoxelColumn count={blocksFor(t.value)} look={matteLook(t.color)} position={atPlaza(x, 0, 0)} quality={quality} />
            {t.lost !== undefined && blocksFor(t.lost) > 0 && (
              <>
                <VoxelColumn count={blocksFor(t.lost)} look={LOST} position={atPlaza(x + 3, 0, 5.5)} w={3} d={3} quality={quality} />
                <Callout anchor={atPlaza(x + 3, 0.1, 7)} offset={[0, -0.3, 0.2]} title={T.towers.lost} />
              </>
            )}
            {t.coins !== undefined && (
              <>
                <CoinPile count={blocksFor(t.coins)} position={atPlaza(x - 3, 0, 5.5)} />
                {blocksFor(t.coins) > 0 && <Callout anchor={atPlaza(x - 3, 0.1, 7)} offset={[0, -0.3, 0.2]} title={T.towers.coins} />}
              </>
            )}
            <Callout anchor={atPlaza(x, 0.1, 3)} offset={[0, -0.3, 8]} title={`${t.label}：${T.towers.value(t.value)}`} mark={t.mark} />
          </group>
        )
      })}
    </>
  )
}
