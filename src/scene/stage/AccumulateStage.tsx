import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { accumulateVsPayout } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function AccumulateStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const r = accumulateVsPayout(periods)
  return (
    <TowerRow
      quality={quality}
      towers={[
        { key: 'acc', label: T.accumulateRows.accumulate, value: r.accumulate.value, color: '#2bb3a3', marks: ['illustrative'] },
        { key: 'pay', label: T.accumulateRows.payout, value: r.payout.value, coins: r.payout.cashReceived, color: '#5c6bc0', marks: ['illustrative'] },
      ]}
    />
  )
}
