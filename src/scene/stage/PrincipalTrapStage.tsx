import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { principalTrap } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function PrincipalTrapStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const st = principalTrap(periods)
  return <TowerRow quality={quality} towers={[{ key: 'trap', label: T.trapRow, value: st.value, coins: st.cashReceived, color: '#ff8a3d', marks: ['illustrative'] }]} />
}
