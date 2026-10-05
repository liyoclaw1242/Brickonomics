import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { universe } from '../../data'
import type { Asset } from '../../data/schema'
import { T } from '../../ui/strings'
import type { Vec3 } from '../camera'
import { CoinDrip } from '../CoinDrip'
import { CoinPile } from '../CoinPile'
import { Callout } from '../Callout'
import { BlockMaterial } from '../materials'
import { ACCENT_COLORS, lookFor } from '../palette'
import type { Quality } from '../quality'
import { BOND_SLOT_X, CRACK_GAP, CRACK_TILT, STOCK_STRESSED_SCALE, tornadoHitAt, tornadoSlotAt, type BondKey } from '../events/tornado'
import type { EventClock } from '../events/types'
import { useEventValue } from '../useEventClock'
import { atPlaza, bondSub } from './plaza'

const SIZE = 2.4
/** 金幣放大（r2：遠景下 1 倍的金幣小到像一條線） */
const COIN_SIZE = 2.2
/** 每張借據旁邊先擺一小堆已經滴下來的金幣（數量跟著滴的快慢，示意），靜止畫面也看得到 */
const pileCount = (rate: number) => Math.round(rate * 2)
const CORP: Asset = { id: 'CORP_DEMO', name: '', type: 'corpBond', asOf: '2026-10-03', source: [] }

type Slot = { key: BondKey; asset: Asset; x: number; rate: number }
const SLOTS: Slot[] = [
  { key: 'stock', asset: universe.get('2330')!, x: BOND_SLOT_X.stock, rate: 0 },
  { key: 'gov', asset: universe.get('US_TREASURY')!, x: BOND_SLOT_X.gov, rate: 0.5 }, // 示意
  { key: 'corp', asset: CORP, x: BOND_SLOT_X.corp, rate: 0.9 }, // 示意
  { key: 'hy', asset: universe.get('US_HIGH_YIELD')!, x: BOND_SLOT_X.hy, rate: 1.5 }, // 示意
]

/** 國家債 #d8f3ff 在白底上太淡：這個舞台局部改用較飽和的冰青色（不動共用的 palette） */
const BOND_COLOR: Partial<Record<Slot['key'], string>> = { gov: '#5fd4ee', corp: '#78909c', hy: '#ffb300' }

const HALF = SIZE / 2
/** 依序被龍捲風掃到的順序（HIT_TIME 由小到大） */
const ORDER: readonly BondKey[] = ['stock', 'gov', 'corp', 'hy']
const hitCount = (t: number | null) => {
  let n = 0
  for (const k of ORDER) if (tornadoHitAt(t, k)) n += 1
  return n
}

type Refs = {
  stock: RefObject<Mesh | null>
  stockMat: RefObject<MeshStandardMaterial | null>
  gov: RefObject<Group | null>
  corp: RefObject<Group | null>
  halves: RefObject<(Mesh | null)[]>
  hyMat: RefObject<(MeshStandardMaterial | null)[]>
}

/** 裂開的高收益債：左右兩半各往外倒、中間留一道縫（角度與縫隨風暴時間由 useFrame 設定；預設＝終點） */
function CrackedBond({ x, refs }: { x: number; refs: Refs }) {
  return (
    <>
      {[-1, 1].map((side, i) => (
        <mesh
          key={side}
          ref={(m) => {
            refs.halves.current[i] = m
          }}
          position={atPlaza(x + side * (HALF / 2 + CRACK_GAP), SIZE / 2, 0)}
          rotation-z={-side * CRACK_TILT}
          castShadow
        >
          <boxGeometry args={[HALF, SIZE, SIZE]} />
          <meshStandardMaterial
            ref={(m) => {
              refs.hyMat.current[i] = m
            }}
            color={ACCENT_COLORS.loss}
            roughness={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

/**
 * 股票方塊 vs 三種借據：材質表示信用品質，金幣快慢表示利息（示意）。
 * 每張借據的標籤下面一行（bondSub）：平常寫「借給誰」；ranks（b-2）改寫「穩不穩、利息多少」（三顆長得很像，要用字分出來）。
 * 經濟風暴（b-3）：步驟的 scene.event 是龍捲風（events/tornado.ts、Tornado.tsx）。這個舞台不畫天氣，只讀同一個事件時鐘：
 * 掃到股票→縮水變紅；國家債、公司債晃一下就站穩；掃到高收益債→裂成兩半、變紅、停付利息。
 * 終點與原本靜態的 stressed 畫面一模一樣；減少動態時時鐘直接在終點。
 */
export function BondShowcase({ ranks = false, quality, event }: { ranks?: boolean; quality: Quality; event: EventClock }) {
  const stressed = event.spec?.kind === 'tornado'
  /** 龍捲風掃過了幾個（離散：換標籤、停金幣） */
  const hits = useEventValue(event, (t) => (stressed ? hitCount(t) : 0))
  const refs: Refs = {
    stock: useRef<Mesh>(null),
    stockMat: useRef<MeshStandardMaterial>(null),
    gov: useRef<Group>(null),
    corp: useRef<Group>(null),
    halves: useRef<(Mesh | null)[]>([]),
    hyMat: useRef<(MeshStandardMaterial | null)[]>([]),
  }
  const stockColor = useMemo(() => lookFor(SLOTS[0]!.asset).color, [])
  const colors = useMemo(
    () => ({ stock: new Color(stockColor), hy: new Color(BOND_COLOR.hy), loss: new Color(ACCENT_COLORS.loss), tmp: new Color() }),
    [stockColor],
  )

  useFrame(() => {
    const t = stressed ? event.t.current : null
    const st = tornadoSlotAt(t, 'stock')
    const m = refs.stock.current
    if (m) {
      m.scale.y = st.scaleY
      m.position.y = (SIZE * st.scaleY) / 2
    }
    refs.stockMat.current?.color.copy(colors.stock).lerp(colors.loss, st.red)
    for (const k of ['gov', 'corp'] as const) {
      const g = refs[k].current
      if (g) g.rotation.z = tornadoSlotAt(t, k).sway
    }
    const hy = tornadoSlotAt(t, 'hy')
    if (hy.broken) {
      const [px] = atPlaza(BOND_SLOT_X.hy)
      ;[-1, 1].forEach((side, i) => {
        const half = refs.halves.current[i]
        if (half) {
          half.position.x = px + side * (HALF / 2 + hy.gap)
          half.rotation.z = -side * hy.tilt
        }
        refs.hyMat.current[i]?.color.copy(colors.hy).lerp(colors.loss, hy.red)
      })
    }
  })

  return (
    <>
      {SLOTS.map((s, i) => {
        const look = lookFor(s.asset)
        const hit = i < hits
        const broken = hit && s.key === 'hy'
        // 標籤與金幣只看離散的「掃到了沒」；縮水的高度在終點才定下來（標籤錨在地面，不受影響）
        const scaleY = hit && s.key === 'stock' ? STOCK_STRESSED_SCALE : 1
        const top: Vec3 = atPlaza(s.x, SIZE * scaleY, 0)
        const pile: Vec3 = atPlaza(s.x + 2.9, 0.1, 0)
        const dripping = s.rate > 0 && !broken
        const sub = bondSub(s.key, ranks)
        return (
          <group key={s.key}>
            {broken ? (
              <CrackedBond x={s.x} refs={refs} />
            ) : s.key === 'stock' ? (
              <mesh ref={refs.stock} position={atPlaza(s.x, SIZE / 2, 0)} castShadow>
                <boxGeometry args={[SIZE, SIZE, SIZE]} />
                <meshStandardMaterial ref={refs.stockMat} color={look.color} />
              </mesh>
            ) : (
              // 以底部為支點晃動（國家債、公司債被風吹到只晃一下）
              <group ref={s.key === 'gov' ? refs.gov : s.key === 'corp' ? refs.corp : undefined} position={atPlaza(s.x, 0, 0)}>
                <mesh position={[0, SIZE / 2, 0]} castShadow>
                  <boxGeometry args={[SIZE, SIZE, SIZE]} />
                  <BlockMaterial kind={look.kind} quality={quality} color={BOND_COLOR[s.key] ?? look.color} />
                </mesh>
              </group>
            )}
            {dripping && <CoinDrip from={top} to={pile} rate={s.rate} size={COIN_SIZE} />}
            {dripping && (
              <group position={pile} scale={COIN_SIZE}>
                <CoinPile count={pileCount(s.rate)} position={[0, 0, 0]} />
              </group>
            )}
            <Callout
              anchor={atPlaza(s.x, 0.1, SIZE / 2)}
              offset={[0, -0.3, 1.4]}
              title={broken ? T.stage.bondHurt(T.stage.bonds.hy) : T.stage.bonds[s.key]}
              sub={sub}
              color={broken ? ACCENT_COLORS.loss : undefined}
              persistent={s.key !== 'stock' || stressed}
            />
          </group>
        )
      })}
    </>
  )
}
