import { useThree } from '@react-three/fiber'
import { layoutModel } from '../../ui/layoutModel'
import type { Mark } from '../../ui/marks'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { CoinPile } from '../CoinPile'
import { blocksFor } from '../layout/stages'
import { ACCENT_COLORS, type BlockLook } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

/**
 * lostLabel：紅色小堆的標註，未填則為「費用扣掉的」。
 * exit：出門費（金額，已含在 lost 裡）；有填就另外堆一小堆、寫上金額。
 * focus：這座是焦點（鮮豔）；同一排有焦點時，其他塔變暗、不畫紅色小堆。
 */
export type TowerSpec = { key: string; label: string; value: number; lost?: number; lostLabel?: string; exit?: number; coins?: number; color: string; marks?: Mark[]; focus?: boolean }

const SPACING = 12
/** VoxelColumn 預設 5×5 一層 */
const TOWER_FLOOR = 25
const looks = new Map<string, BlockLook>()
/** 同一個顏色永遠回傳同一個 look 物件，避免子元件的 memo 每次 render 都失效 */
const matteLook = (color: string): BlockLook => {
  let l = looks.get(color)
  if (!l) looks.set(color, (l = { color, kind: 'matte' }))
  return l
}
const LOST = { color: ACCENT_COLORS.loss, kind: 'matte' as const }

/**
 * 一排方塊塔：塔＝剩下的價值；紅色小堆＝費用扣掉的（或削掉的本金）；金幣堆＝領到的錢（皆 2 元一顆）。
 * base／baseSub：塔前方的計算前提說明與補充（每個舞台的前提不同，由舞台自己給；不給就不顯示）
 */
export function TowerRow({ towers, quality, base, baseSub }: { towers: TowerSpec[]; quality: Quality; base?: string; baseSub?: string }) {
  const start = -((towers.length - 1) * SPACING) / 2
  const size = useThree((s) => s.size)
  // 手機畫面窄：相鄰塔的數值標註會撞在一起，奇數塔的標註再往上錯開一排
  const stagger = layoutModel(size.width, size.height).mobile ? 2.5 : 0
  const anyFocus = towers.some((t) => t.focus)
  return (
    <>
      {base && <Callout anchor={atPlaza(0, -0.2, 12)} offset={[0, 0, 0]} title={base} sub={baseSub} wrap persistent />}
      {towers.map((t, i) => {
        const x = start + i * SPACING
        const dim = anyFocus && !t.focus
        const held = t.lost !== undefined && t.exit !== undefined ? t.lost - t.exit : t.lost
        return (
          <group key={t.key}>
            <VoxelColumn count={blocksFor(t.value)} look={matteLook(t.color)} position={atPlaza(x, 0, 0)} quality={quality} vivid={!!t.focus} />
            {!dim && held !== undefined && blocksFor(held) > 0 && (
              <>
                <VoxelColumn count={blocksFor(held)} look={LOST} position={atPlaza(x + 3, 0, 5.5)} w={3} d={3} quality={quality} />
                <Callout anchor={atPlaza(x + 3, -0.2, 7.2)} offset={[0, 0, 0]} title={t.lostLabel ?? T.towers.lost} persistent={t.lostLabel !== undefined} />
              </>
            )}
            {/* 出門費：放在塔的另一側，金額寫在標註上（拉年數時看它一年一年變少） */}
            {!dim && t.exit !== undefined && (
              <>
                <VoxelColumn count={blocksFor(t.exit)} look={LOST} position={atPlaza(x - 3.5, 0, 5.5)} w={2} d={2} quality={quality} vivid />
                <Callout anchor={atPlaza(x - 3.5, -0.2, 7.2)} offset={[0, 0, 0]} title={T.towers.exit(t.exit)} color={ACCENT_COLORS.loss} persistent />
              </>
            )}
            {t.coins !== undefined && (
              <>
                <CoinPile count={blocksFor(t.coins)} position={atPlaza(x - 3, 0, 5.5)} />
                {blocksFor(t.coins) > 0 && <Callout anchor={atPlaza(x - 3, -0.2, 7.2)} offset={[0, 0, 0]} title={T.towers.coins(t.coins)} />}
              </>
            )}
            {/* 標註放在塔頂上方，不和下方的紅色小堆／金幣堆標註搶位置。數值當標題、名稱當副標；色點＝塔的顏色（3b1b 顏色連結） */}
            <Callout
              anchor={atPlaza(x, Math.ceil(blocksFor(t.value) / TOWER_FLOOR) + 0.1, 0)}
              // 引線短一點：高塔（例如累積型 20 年）的標註才不會飄進後面的城市
              offset={[0, 1.6 + (i % 2) * stagger, 0]}
              title={T.towers.value(t.value)}
              sub={t.label}
              color={t.color}
              marks={t.marks}
              dim={dim}
              persistent={!!t.marks?.length}
            />
          </group>
        )
      })}
    </>
  )
}
