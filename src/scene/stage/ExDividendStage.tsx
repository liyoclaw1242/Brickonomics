import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import type { Mesh } from 'three'
import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { acquire } from '../continuous'
import { CoinDrip } from '../CoinDrip'
import { CoinPile } from '../CoinPile'
import { Callout } from '../Callout'
import { EXDIV, exDivBands, exDivTimeline, type Band, type ExDivOutcome } from '../layout/stages'
import { approach, MAX_FRAME_DT } from '../layout/voxels'
import { ACCENT_COLORS, lookFor } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'

/** 方塊是一根「價值柱」：底面固定、高度 ∝ 價值，少掉 5 才看得出來（體積縮放時 5% 幾乎看不見） */
const FOOT = 3
const FULL_HEIGHT = 7
const hOf = (value: number) => (FULL_HEIGHT * value) / EXDIV.price
const BLOCK_X = -4
const COIN_X = 3.5
/** 金幣放大，讓 5 枚金幣的堆疊在近景看得清楚 */
const COIN_SCALE = 2
const GOLD = ACCENT_COLORS.coin

/** 方塊上方的一段「少掉的部分」：半透明＋外框，金色＝變成金幣，紅色＝沒長回來 */
function BandMesh({ bandRef, color }: { bandRef: RefObject<Mesh | null>; color: string }) {
  return (
    <mesh ref={bandRef} visible={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      <Edges color={color} />
    </mesh>
  )
}

function placeBand(m: Mesh | null, band: Band) {
  if (!m) return
  m.visible = band !== null && band[1] - band[0] > 1e-3
  if (!band || !m.visible) return
  const [lo, hi] = band
  m.scale.set(FOOT, hOf(hi - lo), FOOT)
  m.position.set(...atPlaza(BLOCK_X, hOf((lo + hi) / 2), 0))
}

/**
 * 除息：方塊價值＋金幣。標籤取整數，和面板大數字（n0）一致。
 * 方塊高度跟著價值動畫（例如 s-5 結束在 95、s-6 一進來就縮到 92：看得到「沒長回來」）。
 */
export function ExDividendStage({ outcome }: { outcome: ExDivOutcome; quality?: Quality }) {
  const phase = useTour((s) => s.values.phase)
  const st = exDivTimeline(phase, outcome)
  const look = lookFor(universe.get('2330')!)
  const block = useRef<Mesh>(null)
  const gold = useRef<Mesh>(null)
  const red = useRef<Mesh>(null)
  const shown = useRef(st.blockValue)
  const invalidate = useThree((s) => s.invalidate)
  const release = useRef<(() => void) | null>(null)
  useEffect(() => {
    invalidate()
  }, [st.blockValue, st.cash, invalidate])
  useEffect(
    () => () => {
      release.current?.()
      release.current = null
    },
    [],
  )
  useFrame((_, dt) => {
    let v = approach(shown.current, st.blockValue, Math.min(dt, MAX_FRAME_DT), 2.5)
    const moving = Math.abs(v - st.blockValue) > 0.02
    if (!moving) v = st.blockValue
    shown.current = v
    const b = block.current
    if (b) {
      b.scale.set(FOOT, hOf(v), FOOT)
      b.position.set(...atPlaza(BLOCK_X, hOf(v) / 2, 0))
    }
    const bands = exDivBands(v, st.cash)
    placeBand(gold.current, bands.gold)
    placeBand(red.current, bands.red)
    if (moving) {
      if (!release.current) release.current = acquire()
      invalidate()
    } else {
      release.current?.()
      release.current = null
    }
  })
  const bands = exDivBands(st.blockValue, st.cash)
  // 一次性：越過配發點就掉出 round(cash) 枚金幣，掉完就停；往回拉到配發前再越過才會重播
  const paying = phase >= 0.5
  const lost = bands.red ? bands.red[1] - bands.red[0] : 0
  return (
    <>
      <mesh ref={block} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={look.color} />
      </mesh>
      <BandMesh bandRef={gold} color={GOLD} />
      <BandMesh bandRef={red} color={ACCENT_COLORS.loss} />
      <group position={atPlaza(COIN_X, 0, 0)} scale={COIN_SCALE}>
        <CoinPile count={Math.round(st.cash)} position={[0, 0, 0]} />
      </group>
      {paying && <CoinDrip from={atPlaza(BLOCK_X, hOf(EXDIV.price), 0)} to={atPlaza(COIN_X, 0.3, 0)} rate={6} fallTime={0.8} size={COIN_SCALE} limit={Math.round(st.cash)} />}
      <Callout anchor={atPlaza(BLOCK_X, 0.1, FOOT / 2)} offset={[0, -0.3, 1.5]} title={`${T.stage.exdiv.block} ${st.blockValue.toFixed(0)}`} persistent />
      <Callout anchor={atPlaza(COIN_X, 0.1, 1.5)} offset={[0, -0.3, 1.5]} title={`${T.stage.exdiv.coins} ${st.cash.toFixed(0)}`} color={GOLD} persistent />
      {/* 紅色那一段寫明是什麼：沒長回來、真的少掉的部分 */}
      {lost > 0.5 && (
        <Callout
          // 往右（金幣那一側的上方）：往左在手機上會超出畫面
          anchor={atPlaza(BLOCK_X + FOOT / 2, hOf((bands.red![0] + bands.red![1]) / 2), 0)}
          offset={[2.2, 0, 0]}
          title={T.stage.exdiv.lost(Math.round(lost))}
          color={ACCENT_COLORS.loss}
          persistent
        />
      )}
    </>
  )
}
