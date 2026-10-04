import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { principalTrap } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function PrincipalTrapStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const st = principalTrap(periods)
  // 紅色小堆＝配息削掉的本金（模擬直接記帳的 fromPrincipal）
  return (
    <TowerRow
      quality={quality}
      base={T.towers.baseDemo}
      towers={[{ key: 'trap', label: T.trapRow, value: st.value, lost: st.fromPrincipal, lostLabel: T.towers.lostPrincipal, coins: st.cashReceived, color: '#ff8a3d', marks: ['illustrative'] }]}
    />
  )
}
