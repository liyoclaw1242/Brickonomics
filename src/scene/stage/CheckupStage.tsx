import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { checkupOf } from '../../data/fundCheckup'
import { assetGroups, feeSummary, fundSizeYi, shortName } from '../../sim/checkup'
import { effectiveExplode, useSandbox } from '../../store/sandbox'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { Callout } from '../Callout'
import type { Vec3 } from '../camera'
import { timeAtX } from '../events/tornado'
import type { EventClock } from '../events/types'
import { basketSpec, basketVoxels } from '../layout/basket'
import { checkupBasket, checkupHyDamage } from '../layout/practice'
import { layerCentroid } from '../layout/stages'
import { ACCENT_COLORS } from '../palette'
import type { Quality } from '../quality'
import { useEventValue } from '../useEventClock'
import { Excavator } from './Excavator'
import { FeeMeter } from './FeeMeter'
import { EXCHANGE_POSITION, PEDESTAL_HEIGHT } from './plaza'

export type CheckupShow = 'card' | 'mix' | 'hy' | 'fee' | 'final'

const NO_DAMAGE: Readonly<Record<string, number>> = {}
const RIGHT: Vec3 = [3, 1.2, 0]
const LEFT: Vec3 = [-2.4, 0, 0]
const LEFT_FAR: Vec3 = [-16, 0, 0]
/** 窄畫面（手機）的寬度門檻與要標名字的最薄層 */
const NARROW_PX = 600
const NARROW_MIN_PCT = 4
const MIN_LABEL_PCT = 2

/**
 * 實戰課的體檢塔（真資料）：快照的資產大類變成一座基金塔（layout/practice checkupBasket），站在交易所台座上（和 f-1、f-2 的基金塔同一個位置與鏡頭）。
 * card＝怪手＋塔＋名片標註；mix＝拆開（scene.explode）標三大類與掩護性買權；hy＝🌪 龍捲風掃過時高收益債那幾層裂開（裂多少是示意）；
 * fee＝怪手＋計費表（每年先扣的費用從資料讀）；final＝只有塔（體檢表）。
 */
export function CheckupStage({ fund, show, quality, event }: { fund: string; show: CheckupShow; quality: Quality; event: EventClock }) {
  const f = checkupOf(fund)
  const b = useMemo(() => checkupBasket(f), [f])
  const groups = useMemo(() => assetGroups(f), [f])
  const explode = useSandbox(effectiveExplode)
  const narrow = useThree((s) => s.size.width) < NARROW_PX
  const spec = basketSpec(b.universe, b.productId, quality)
  const voxels = useMemo(() => basketVoxels(b.universe, b.productId, spec), [b, spec])
  const position: Vec3 = [EXCHANGE_POSITION[0], PEDESTAL_HEIGHT, EXCHANGE_POSITION[2]]
  const tornado = show === 'hy' && event.spec?.kind === 'tornado'
  // 龍捲風掃到塔的那一刻才裂（減少動態時直接在終點）
  const hit = useEventValue(event, (t) => tornado && t !== null && t >= timeAtX(EXCHANGE_POSITION[0]))
  const hyDamage = useMemo(() => checkupHyDamage(b), [b])
  const hyIds = useMemo(() => Object.keys(hyDamage), [hyDamage])
  const allIds = useMemo(() => b.holdings.map((h) => h.id), [b])
  // 這座塔就是主角：全部鮮豔；hy 只亮高收益債那幾層
  const focus = show === 'hy' ? hyIds : allIds

  /** 某一層在塔右側（或左側）的錨點 */
  const anchorOf = (id: string, side: 1 | -1 = 1): Vec3 | null => {
    const g = b.holdings.findIndex((h) => h.id === id)
    const p = g < 0 ? null : layerCentroid(voxels, g, spec.w, spec.d, explode, b.holdings.length)
    return p ? [position[0] + side * (spec.w / 2 + 0.2), position[1] + p[1], position[2] + p[2]] : null
  }
  const topY = spec.total / (spec.w * spec.d)
  const firstOf = (group: 'stock' | 'bond' | 'cash') => b.holdings.find((h) => h.group === group)
  const cc = b.holdings.find((h) => h.kind === 'coveredCall')
  const hy = b.holdings.find((h) => h.kind === 'highYield')

  return (
    <>
      <Basket
        u={b.universe}
        looks={b.looks}
        productId={b.productId}
        quality={quality}
        position={position}
        slice={0}
        sliceAxis="x"
        explode={explode}
        focusIds={focus}
        damage={hit ? hyDamage : NO_DAMAGE}
      />
      {(show === 'card' || show === 'fee') && <Excavator />}
      {show === 'fee' && <FeeMeter rate={feeSummary(f).ongoing / 100} />}
      {show === 'card' && (
        <>
          <Callout
            anchor={[position[0] + spec.w / 2 + 0.2, position[1] + topY, position[2]]}
            offset={[3.2, 1.4, 0]}
            title={shortName(f)}
            sub={T.checkup.cardSub(f.basics.domicile.value ?? '', T.date(f.basics.inceptionDate.value ?? ''))}
            persistent
          />
          <Callout
            anchor={[position[0] + spec.w / 2 + 0.2, position[1] + topY * 0.4, position[2]]}
            offset={[3.2, -0.6, 1]}
            title={T.checkup.size}
            sub={T.checkup.sizeSub(fundSizeYi(f), T.currency('USD'), T.date(f.basics.fundSize.value?.asOf ?? f.basics.fundSize.source.date))}
            persistent
          />
        </>
      )}
      {/* 三大類寫在右邊；掩護性買權是股票裡的一層（寫在股票的副標）；每一層的名字寫在左邊（prac-r1：好幾層沒有名字） */}
      {show === 'mix' &&
        (['stock', 'bond', 'cash'] as const).map((g) => {
          const h = firstOf(g)
          const a = h && anchorOf(h.id)
          if (!a) return null
          const sub = g === 'stock' ? (cc ? T.checkup.stockSub(cc.pct.toFixed(1)) : undefined) : g === 'bond' && !narrow ? T.checkup.bondSub : undefined
          return <Callout key={g} anchor={a} offset={RIGHT} title={T.checkup.group[g](groups[g].toFixed(1))} sub={sub} color={b.looks[b.holdings.indexOf(h)]!.color} persistent />
        })}
      {show === 'mix' &&
        b.holdings.map((h, i) => {
          if (h.group === 'cash') return null
          // 手機畫面窄：遠的那一排會跑出畫面，只標比較厚的層（全部的名字在即時數字）
          if (narrow && (i % 2 === 1 || h.pct < NARROW_MIN_PCT)) return null
          // 不到 2% 的薄層：名字和隔壁疊在一起，只寫在即時數字
          if (h.pct < MIN_LABEL_PCT) return null
          const a = anchorOf(h.id, -1)
          // 薄的層上下挨在一起：一個近、一個遠地交錯，名字才不會疊
          return a ? <Callout key={h.id} anchor={a} offset={i % 2 === 0 || narrow ? LEFT : LEFT_FAR} title={T.checkup.layer(h.zh, h.pct.toFixed(1))} color={b.looks[i]!.color} compact persistent /> : null
        })}
      {show === 'hy' && hy && (() => {
        const a = anchorOf(hy.id)
        return a ? (
          <Callout
            anchor={a}
            offset={RIGHT}
            title={T.checkup.hy(groups.highYield.toFixed(1))}
            sub={hit ? T.checkup.hyHit : T.checkup.hySub}
            color={hit ? ACCENT_COLORS.loss : b.looks[b.holdings.indexOf(hy)]!.color}
            subColor={hit ? ACCENT_COLORS.loss : undefined}
            persistent
          />
        ) : null
      })()}
    </>
  )
}
