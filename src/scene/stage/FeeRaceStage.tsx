import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRace } from '../../sim/feeRace'
import { T } from '../../ui/strings'
import type { Quality } from '../quality'
import { Html } from '@react-three/drei'
import { labelStyle } from '../labelStyle'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'
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
    unverified: r.unverified.length > 0,
  }))
  const ready = useAfterFirstTick()
  return (
    <>
      <TowerRow towers={towers} quality={quality} />
      {ready && (
        <Html position={atPlaza(0, -0.2, 16)} center style={labelStyle}>
          {T.feeRaceCaveat}
        </Html>
      )}
    </>
  )
}
