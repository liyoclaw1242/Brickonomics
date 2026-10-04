import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRaceRows } from '../../sim/feeRace'
import { T } from '../../ui/strings'
import type { Quality } from '../quality'
import { TowerRow, type TowerSpec } from './TowerRow'

const COLORS = { front: '#5c6bc0', back: '#8a5cf6', etf: '#2bb3a3' } as const

/**
 * 費用比一比：前收、後收（、0050）的塔（投入 100、報酬 0，只比費用）。
 * etf false（導覽 f-6／f-7）：還沒教 ETF，只放同一檔基金的兩種收費方式。
 * focus 'back'（f-7）：只看後收那座，其他變暗；後收的費用拆成「每年的費用」和「出門費」兩小堆。
 * 塔上的標註＝名稱＋一個數字；✎／？ 標示只在面板標題旁出現一次，前提與提醒放在「多說一點」。
 */
export function FeeRaceStage({ focus, etf = true, quality }: { focus?: 'back'; etf?: boolean; quality: Quality }) {
  const years = useTour((s) => s.values.years)
  const frontLoad = useTour((s) => s.values.frontLoad)
  const towers: TowerSpec[] = feeRaceRows(universe, years, frontLoad, etf).map((r) => {
    const focused = focus === r.id
    return {
      key: r.id,
      label: T.feeTowers[r.id],
      value: r.value,
      lost: r.lost,
      ...(focused ? { exit: r.exit, lostLabel: T.towers.held, focus: true } : {}),
      color: COLORS[r.id],
    }
  })
  return <TowerRow towers={towers} quality={quality} />
}
