import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, type Mesh, type MeshStandardMaterial } from 'three'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { freezeTint, frostMix } from '../events/freeze'
import type { EventClock } from '../events/types'
import { SEESAW, seesawPose } from '../layout/intermediate'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

/** 市場利率那一端：冷藍色的柱子（高度＝利率） */
const RATE_COLOR = '#4fa3e0'
/** 舊借據：金色的板子（結霜時往冰藍混） */
const BOND_COLOR = '#d4a72c'

/**
 * b-rate 利率翹翹板：左端「市場利率」（柱子高度＝利率），右端「舊借據」（價格由 bondPrice 算）。
 * 拖市場利率：利率那端往上、舊借據那端往下（板子斜的角度跟著價格）。拖到 5% 時 scene.eventWhen 打開寒流（events/Freeze）：
 * 一陣寒風吹過，舊借據結霜（顏色用 frostMix 往冰藍混）。寒流的目標就是 5% 時借據坐的位置（layout/intermediate.rateFreeze）。
 */
export function SeesawStage({ event }: { event: EventClock }) {
  const rate = useTour((s) => s.values.rate)
  const pose = seesawPose(rate)
  const theme = THEMES[useThemeStore((s) => s.theme)]
  const plank = useRef<Mesh>(null)
  const rateCol = useRef<Mesh>(null)
  const bond = useRef<Mesh>(null)
  const bondMat = useRef<MeshStandardMaterial>(null)
  const colors = useMemo(() => ({ base: new Color(BOND_COLOR), ice: new Color(), c: new Color() }), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [rate, invalidate])
  const freeze = event.spec?.kind === 'freeze' ? event.spec : undefined
  const half = SEESAW.thick / 2
  const rateH = Math.max(0.05, rate * SEESAW.rateH)

  useFrame(() => {
    const p = plank.current
    if (p) p.rotation.set(0, 0, -pose.theta)
    rateCol.current?.position.set(...atPlaza(pose.left[0], pose.left[1] + half + rateH / 2, 0))
    rateCol.current?.scale.set(SEESAW.rateW, rateH, SEESAW.rateW)
    const [bw, bh] = SEESAW.bond
    bond.current?.position.set(...atPlaza(pose.right[0], pose.right[1] + half + bh / 2, 0))
    bond.current?.scale.set(bw, bh, SEESAW.bond[2])
    const m = bondMat.current
    if (m) {
      colors.ice.set(theme.frost.ice)
      const k = freeze ? freezeTint(freeze, 0, event.reduced ? Infinity : event.t.current) : 0
      const { base, ice, c } = colors
      const [r, g, b] = frostMix([base.r, base.g, base.b], [ice.r, ice.g, ice.b], k)
      m.color.copy(c.setRGB(r, g, b))
    }
  })

  return (
    <>
      {/* 支點：三角柱 */}
      <mesh position={atPlaza(0, SEESAW.pivotY / 2, 0)} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[SEESAW.pivotY * 0.75, SEESAW.pivotY * 0.75, SEESAW.width * 0.8, 3]} />
        <meshStandardMaterial color={theme.calloutLine} roughness={0.8} />
      </mesh>
      <mesh ref={plank} position={atPlaza(0, SEESAW.pivotY, 0)} castShadow receiveShadow>
        <boxGeometry args={[SEESAW.half * 2, SEESAW.thick, SEESAW.width]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.85} />
      </mesh>
      <mesh ref={rateCol} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={RATE_COLOR} roughness={0.6} />
      </mesh>
      <mesh ref={bond} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={bondMat} color={BOND_COLOR} roughness={0.45} metalness={0.3} />
      </mesh>
      <Callout anchor={atPlaza(pose.left[0], pose.left[1] + half + rateH, 0)} offset={[1.4, 1.8, 0]} title={T.seesaw.rate(T.controls.rateValue(rate))} color={RATE_COLOR} persistent />
      <Callout
        anchor={atPlaza(pose.right[0], pose.right[1] + half + SEESAW.bond[1], 0)}
        // 兩個字塊都往內（翹翹板中間）長：手機上不會超出畫面
        offset={[-1.4, 2.2, 0]}
        title={T.seesaw.bond(Math.round(pose.price))}
        sub={T.seesaw.maturity}
        color={BOND_COLOR}
        persistent
      />
    </>
  )
}
