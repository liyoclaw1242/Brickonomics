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
      base={T.towers.baseDemo}
      towers={[
        { key: 'acc', name: T.accumulateRows.accumulate, label: T.accumulateSubs.accumulate, value: r.accumulate.value, color: '#2bb3a3' },
        { key: 'pay', name: T.accumulateRows.payout, label: T.accumulateSubs.payout, value: r.payout.value, coins: r.payout.cashReceived, color: '#5c6bc0' },
      ]}
    />
  )
}
