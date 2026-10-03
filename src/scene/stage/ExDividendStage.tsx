import { Html } from '@react-three/drei'
import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { CoinDrip } from '../CoinDrip'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { exDivTimeline, type ExDivOutcome } from '../layout/stages'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const BASE_EDGE = 4

/** 除息：方塊體積 ∝ 價值；金幣一枚 = 1（示意價格 100、股利 5） */
export function ExDividendStage({ outcome }: { outcome: ExDivOutcome; quality?: Quality }) {
  const phase = useTour((s) => s.values.phase)
  const ready = useAfterFirstTick()
  const st = exDivTimeline(phase, outcome)
  const edge = BASE_EDGE * Math.cbrt(st.blockValue / 100)
  const look = lookFor(universe.get('2330')!)
  const paying = phase >= 0.5 && phase < 0.62
  return (
    <>
      <mesh position={atPlaza(-4, edge / 2, 0)} castShadow>
        <boxGeometry args={[edge, edge, edge]} />
        <meshStandardMaterial color={look.color} />
      </mesh>
      <CoinPile count={Math.round(st.cash)} position={atPlaza(3, 0, 0)} />
      {paying && <CoinDrip from={atPlaza(-4, edge, 0)} to={atPlaza(3, 0.3, 0)} rate={6} fallTime={0.8} />}
      {ready && (
        <>
          <Html position={atPlaza(-4, -0.2, 3)} center style={labelStyle}>
            {T.stage.exdiv.block} {st.blockValue.toFixed(1)}
            {T.stage.illustrativeTag}
          </Html>
          <Html position={atPlaza(3.5, -0.2, 3)} center style={labelStyle}>
            {T.stage.exdiv.coins} {st.cash.toFixed(1)}
          </Html>
        </>
      )}
    </>
  )
}
