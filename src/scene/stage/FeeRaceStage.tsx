import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRace } from '../../sim/feeRace'
import { feeRowMarks } from '../../ui/marks'
import { T } from '../../ui/strings'
import type { Quality } from '../quality'
import { TowerRow, type TowerSpec } from './TowerRow'

const COLORS = { front: '#5c6bc0', back: '#8a5cf6', etf: '#2bb3a3' } as const

export function FeeRaceStage({ quality }: { quality: Quality }) {
  const years = useTour((s) => s.values.years)
  const frontLoad = useTour((s) => s.values.frontLoad)
  const towers: TowerSpec[] = feeRace(universe, years, frontLoad).map((r) => ({
    key: r.id,
    label: r.id === 'front' ? T.feeRows.front(frontLoad) : T.feeRows[r.id],
    value: r.value,
    lost: r.lost,
    color: COLORS[r.id],
    marks: feeRowMarks(r.id, r.unverified.length),
  }))
  return (
    <>
      {/* 前提與提醒合成一個標註，免得兩條長字串疊在一起或掉到時間軸底下 */}
      <TowerRow towers={towers} quality={quality} base={T.towers.base} baseSub={T.feeRaceCaveat} />
    </>
  )
}
