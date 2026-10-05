import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRaceRows } from '../../sim/feeRace'
import { T } from '../../ui/strings'
import { feeTowerSpecs } from '../layout/towers'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

/**
 * 費用比一比：前收、後收（、0050）的塔（投入 100 萬、報酬 0，只比費用）。
 * etf false（導覽 f-6）：還沒教 ETF，只放同一檔基金的兩種收費方式。
 * 每座塔：名稱＋數值；旁邊兩小堆＝進門費或出門費、每年費用（一直在扣）。
 * ✎／？ 標示只在面板上出現一次，前提與提醒放在「多說一點」。
 */
export function FeeRaceStage({ etf = true, quality }: { etf?: boolean; quality: Quality }) {
  const years = useTour((s) => s.values.years)
  const frontLoad = useTour((s) => s.values.frontLoad)
  return <TowerRow towers={feeTowerSpecs(feeRaceRows(universe, years, frontLoad, etf))} quality={quality} base={T.towers.base} baseSub={T.towers.feesOnly} />
}
