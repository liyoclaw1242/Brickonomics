import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRace } from '../../sim/feeRace'
import { feeRowMarks } from '../../ui/marks'
import { T } from '../../ui/strings'
import type { Quality } from '../quality'
import { TowerRow, type TowerSpec } from './TowerRow'

const COLORS = { front: '#5c6bc0', back: '#8a5cf6', etf: '#2bb3a3' } as const

/**
 * 費用比一比：前收、後收、0050 三座塔（投入 100、報酬 0，只比費用）。
 * focus 'back'（f-7）：只看後收那座，其他變暗；後收的費用拆成「每年的費用」和「出門費」兩小堆。
 * 長的前提與提醒放在面板的「多說一點」，畫面上只留一句「只比費用」。
 */
export function FeeRaceStage({ focus, quality }: { focus?: 'back'; quality: Quality }) {
  const years = useTour((s) => s.values.years)
  const frontLoad = useTour((s) => s.values.frontLoad)
  const towers: TowerSpec[] = feeRace(universe, years, frontLoad).map((r) => {
    const focused = focus === r.id
    return {
      key: r.id,
      label: T.feeTowers[r.id],
      value: r.value,
      lost: r.lost,
      ...(focused ? { exit: r.exit, lostLabel: T.towers.held, focus: true } : {}),
      color: COLORS[r.id],
      marks: feeRowMarks(r.id, r.unverified.length),
    }
  })
  return <TowerRow towers={towers} quality={quality} base={T.towers.base} />
}
