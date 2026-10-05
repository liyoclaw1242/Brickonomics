import { useThree } from '@react-three/fiber'
import { layoutModel } from '../../ui/layoutModel'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { CoinPile } from '../CoinPile'
import { blocksFor } from '../layout/stages'
import { ACCENT_COLORS, type BlockLook } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'
import { towerTitle, type TowerSpec } from '../layout/towers'
import { VoxelColumn } from './VoxelColumn'

const SPACING = 12
/** VoxelColumn 預設 5×5 一層 */
const TOWER_FLOOR = 25
/** 超過這麼多層的塔，數值標註放在塔的旁邊 */
const TALL_LAYERS = 4
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
  // 手機上進門／出門費和每年費用兩個標註會撞在一起：門的那個往前（往下）錯開一排
  // 桌機也錯開（mid-r1 14-b：進門費、每年費用、出門費、每年費用四個標註擠成一排）
  const doorDrop = stagger > 0 ? 2.4 : 1.8
  return (
    <>
      {/* 手機上門費標註往前錯開了一排：前提說明再往前一點，免得疊在一起 */}
      {base && <Callout anchor={atPlaza(0, -0.2, 12 + doorDrop)} offset={[0, 0, 0]} title={base} sub={baseSub} wrap persistent />}
      {towers.map((t, i) => {
        const x = start + i * SPACING
        const dim = anyFocus && !t.focus
        // 拆出進門／出門費後剩下的（每年的）費用；浮點誤差可能讓它變成 −0.000…，夾到 0
        const held = t.lost !== undefined && t.door !== undefined ? Math.max(0, t.lost - t.door.amount) : t.lost
        return (
          <group key={t.key}>
            <VoxelColumn count={blocksFor(t.value)} look={matteLook(t.color)} position={atPlaza(x, 0, 0)} quality={quality} vivid={!!t.focus} />
            {!dim && held !== undefined && blocksFor(held) > 0 && (
              <>
                <VoxelColumn count={blocksFor(held)} look={LOST} position={atPlaza(x + 3, 0, 5.5)} w={3} d={3} quality={quality} />
                <Callout anchor={atPlaza(x + 3, -0.2, 7.2)} offset={[0, 0, 0]} title={t.lostLabel ?? T.towers.lost} persistent={t.lostLabel !== undefined} />
              </>
            )}
            {/* 進門費／出門費：放在塔的另一側，金額寫在標註上（拉年數時看出門費一年一年變少） */}
            {!dim && t.door !== undefined && (
              <>
                <VoxelColumn count={blocksFor(t.door.amount)} look={LOST} position={atPlaza(x - 3.5, 0, 5.5)} w={2} d={2} quality={quality} vivid />
                <Callout anchor={atPlaza(x - 3.5, -0.2, 7.2 + doorDrop)} offset={[0, 0, 0]} title={t.door.label} color={ACCENT_COLORS.loss} persistent />
              </>
            )}
            {t.coins !== undefined && (
              <>
                <CoinPile count={blocksFor(t.coins)} position={atPlaza(x - 3, 0, 5.5)} />
                {/* 有副標（配息陷阱：其中多少是本金）時一直顯示、用虧損色，總數才不會看成全是賺的 */}
                {blocksFor(t.coins) > 0 && (
                  <Callout
                    anchor={atPlaza(x - 3, -0.2, 7.2)}
                    offset={[0, 0, 0]}
                    title={T.towers.coins(t.coins)}
                    sub={t.coinsSub}
                    subColor={t.coinsSub !== undefined ? ACCENT_COLORS.loss : undefined}
                    persistent={t.coinsSub !== undefined}
                  />
                )}
              </>
            )}
            {/* 標註放在塔頂上方，不和下方的紅色小堆／金幣堆標註搶位置。數值當標題、名稱當副標；色點＝塔的顏色（3b1b 顏色連結） */}
            <Callout
              anchor={atPlaza(x, Math.ceil(blocksFor(t.value) / TOWER_FLOOR) + 0.1, 0)}
              // 高塔（例如累積型 20 年）頂上的標註會疊到後面城市的大樓：改放塔的右邊（r2）
              offset={Math.ceil(blocksFor(t.value) / TOWER_FLOOR) > TALL_LAYERS ? [3.6, -0.6, 0] : [0, 2.4 + (i % 2) * stagger, 0]}
              title={towerTitle(t)}
              sub={t.label}
              color={t.color}
              dim={dim}
              persistent
            />
          </group>
        )
      })}
    </>
  )
}
