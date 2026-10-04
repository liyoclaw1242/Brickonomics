import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { principalTrap } from '../layout/stages'
import { trapTowerSpec } from '../layout/towers'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function PrincipalTrapStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  // 紅色小堆＝配息削掉的本金（模擬直接記帳的 fromPrincipal）；金幣堆標註寫出其中多少是本金
  return <TowerRow quality={quality} base={T.towers.baseDemo} towers={[trapTowerSpec(principalTrap(periods))]} />
}
