import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, type Mesh, type MeshStandardMaterial } from 'three'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { DURATION } from '../../sim/duration'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { freezeTint, frostMix } from '../events/freeze'
import type { EventClock } from '../events/types'
import { DUR_LAYOUT, durNow, durPose, type DurKey } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

/** 市場利率那一端：和 b-rate 一樣的冷藍色柱子 */
const RATE_COLOR = '#4fa3e0'
const KEYS: readonly DurKey[] = ['short', 'long']
const pct1 = (r: number) => `${(Math.abs(r) * 100).toFixed(1)}%`

/**
 * a-dur 長短借據：前面短板（2 年借據）、後面長板（20 年借據）。左端一樣高的藍柱＝市場利率，右端坐借據。
 * 拖市場利率 2% → 3%：同樣的利率變動，長板斜得多、借據那端掉得多（價格由 sim/duration 的 priceChange 算）。
 * 拉到 3% 時 scene.eventWhen 打開寒流：兩張借據結霜，20 年那張霜更厚（freeze 的 length）。
 */
export function DurationStage({ event }: { event: EventClock }) {
  const rate = useTour((s) => s.values.rate)
  const now = durNow(rate)
  const theme = THEMES[useThemeStore((s) => s.theme)]
  const planks = { short: useRef<Mesh>(null), long: useRef<Mesh>(null) }
  const rates = { short: useRef<Mesh>(null), long: useRef<Mesh>(null) }
  const bonds = { short: useRef<Mesh>(null), long: useRef<Mesh>(null) }
  const mats = { short: useRef<MeshStandardMaterial>(null), long: useRef<MeshStandardMaterial>(null) }
  const colors = useMemo(() => ({ short: new Color(ACCENT_COLORS.short), long: new Color(ACCENT_COLORS.long), ice: new Color(), c: new Color() }), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.rate, invalidate])
  const freeze = event.spec?.kind === 'freeze' ? event.spec : undefined
  const half = DUR_LAYOUT.thick / 2
  const rateH = Math.max(0.05, now.rate * DUR_LAYOUT.rateH)
  const [bw, bh, bd] = DUR_LAYOUT.bond

  useFrame(() => {
    colors.ice.set(theme.frost.ice)
    KEYS.forEach((k, i) => {
      const pose = durPose(k, now.rate)
      const z = DUR_LAYOUT.z[k]
      const x0 = DUR_LAYOUT.x[k]
      planks[k].current?.rotation.set(0, 0, -pose.theta)
      rates[k].current?.position.set(...atPlaza(x0 + pose.left[0], pose.left[1] + half + rateH / 2, z))
      rates[k].current?.scale.set(DUR_LAYOUT.rateW, rateH, DUR_LAYOUT.rateW)
      bonds[k].current?.position.set(...atPlaza(x0 + pose.right[0], pose.right[1] + half + bh / 2, z))
      bonds[k].current?.rotation.set(0, 0, -pose.theta)
      const m = mats[k].current
      if (m) {
        const amount = freeze ? freezeTint(freeze, i, event.reduced ? Infinity : event.t.current) : 0
        const base = colors[k]
        const [r, g, b] = frostMix([base.r, base.g, base.b], [colors.ice.r, colors.ice.g, colors.ice.b], amount)
        m.color.copy(colors.c.setRGB(r, g, b))
      }
    })
  })

  return (
    <>
      {KEYS.map((k) => {
        const z = DUR_LAYOUT.z[k]
        const x0 = DUR_LAYOUT.x[k]
        const pose = durPose(k, now.rate)
        return (
          <group key={k}>
            <mesh position={atPlaza(x0, DUR_LAYOUT.pivotY / 2, z)} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[DUR_LAYOUT.pivotY * 0.7, DUR_LAYOUT.pivotY * 0.7, DUR_LAYOUT.width * 0.8, 3]} />
              <meshStandardMaterial color={theme.calloutLine} roughness={0.8} />
            </mesh>
            <mesh ref={planks[k]} position={atPlaza(x0, DUR_LAYOUT.pivotY, z)} castShadow receiveShadow>
              <boxGeometry args={[DUR_LAYOUT.half[k] * 2, DUR_LAYOUT.thick, DUR_LAYOUT.width]} />
              <meshStandardMaterial color="#8d6e63" roughness={0.85} />
            </mesh>
            <mesh ref={rates[k]} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={RATE_COLOR} roughness={0.6} />
            </mesh>
            <mesh ref={bonds[k]} castShadow>
              <boxGeometry args={[bw, bh, bd]} />
              <meshStandardMaterial ref={mats[k]} color={ACCENT_COLORS[k]} roughness={0.45} metalness={0.2} />
            </mesh>
            <Callout
              anchor={atPlaza(x0 + pose.right[0], pose.right[1] + half + bh, z)}
              offset={[0, 2.2, 0]}
              title={T.dur.bond(DURATION[k])}
              sub={now[k] < 0 ? T.dur.drop(pct1(now[k])) : undefined}
              color={ACCENT_COLORS[k]}
              persistent
            />
          </group>
        )
      })}
      {/* 市場利率寫一次（兩個翹翹板一樣）；寒流來了說明它是什麼 */}
      <Callout
        anchor={atPlaza(DUR_LAYOUT.x.long + durPose('long', now.rate).left[0], durPose('long', now.rate).left[1] + half + rateH, DUR_LAYOUT.z.long)}
        offset={[1, 3.2, 0]}
        title={T.dur.rate(T.controls.rateValue(now.rate))}
        sub={freeze ? T.seesaw.cold : T.seesaw.rateIs}
        color={RATE_COLOR}
        persistent
      />
    </>
  )
}
