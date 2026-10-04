import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { principalTrap, TRAP_DEMO } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function PrincipalTrapStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const st = principalTrap(periods)
  // 示意基金價格不變，塔少掉的部分＝配息削掉的本金（紅色小堆）
  const lost = Math.max(0, TRAP_DEMO.initialValue - st.value)
  return (
    <TowerRow
      quality={quality}
      towers={[{ key: 'trap', label: T.trapRow, value: st.value, lost, lostLabel: T.towers.lostPrincipal, coins: st.cashReceived, color: '#ff8a3d', marks: ['illustrative'] }]}
    />
  )
}
