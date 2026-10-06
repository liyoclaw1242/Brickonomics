import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { type InstancedMesh, type Mesh, Object3D } from 'three'
import { COVERED_CALL } from '../../sim/coveredCall'
import { checkupOf } from '../../data/fundCheckup'
import { useTour } from '../../store/tour'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { CC_LAYOUT, ccNow } from '../layout/practice'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { prefersReducedMotion } from '../useRevealAfterCamera'
import { atPlaza, PLAZA } from './plaza'

const { x: X, w: W, unit, coinX, coinR, coinT } = CC_LAYOUT
/** 塔長高、縮短的速度（每秒趨近的比例）；減少動態時直接到位 */
const EASE_RATE = 6
const pctOf = (r: number) => Math.round(r * 100)
/** 塔中心（廣場座標）；useFrame 裡直接用數字設定位置，不配置陣列 */
const [PX, PY, PZ] = PLAZA

/**
 * x-cc 掩護性買權：一座塔（你的股票，起點 100＝框線），頭上一條虛線天花板（漲 cap）。
 * 拖漲幅：下跌時塔一樣變矮；上漲超過天花板的那段賣掉了——畫成空的虛線框（看得到少了什麼）；
 * 塔右邊立著一枚金幣＝賣掉上半截換到的權利金（不管漲跌都拿到）。上漲時天氣放晴（步驟的 scene.event sunnyTree＋eventWhen）。
 * 每種材質一個 mesh；useFrame 裡不配置物件；數字全部來自 sim/coveredCall（≈ 示意）。
 */
export function CoveredCallStage({ fund }: { fund?: string } = {}) {
  const sleeve = fund ? checkupOf(fund).assetAllocation.value?.items.find((i) => i.kind === 'coveredCall') : undefined
  const n = ccNow(useTour((s) => s.values.ccMove))
  const line = THEMES[useThemeStore((s) => s.theme)].calloutLine
  const [reduced] = useState(prefersReducedMotion)
  const tower = useRef<Mesh>(null)
  const cut = useRef<Mesh>(null)
  const coins = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  // 金幣只在枚數變時擺一次（不跟著拉桿動）
  useLayoutEffect(() => {
    const m = coins.current
    if (!m) return
    for (let i = 0; i < n.coins; i++) {
      dummy.position.set(...atPlaza(coinX, coinT * (i + 0.5), 0))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [n.coins, dummy])
  // 畫面上目前的高度（起點 100 的單位），每幀趨近 n.kept／n.full
  const cur = useRef({ kept: n.kept, full: n.full })
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [n.movePct, invalidate])

  useFrame((_, dt) => {
    const c = cur.current
    const k = reduced ? 1 : Math.min(1, dt * EASE_RATE)
    c.kept += (n.kept - c.kept) * k
    c.full += (n.full - c.full) * k
    if (Math.abs(n.kept - c.kept) < 0.01) c.kept = n.kept
    if (Math.abs(n.full - c.full) < 0.01) c.full = n.full
    if (c.kept !== n.kept || c.full !== n.full) invalidate()
    const h = c.kept * unit
    const t = tower.current
    if (t) {
      t.scale.set(W, h, W)
      t.position.set(PX + X, PY + h / 2, PZ)
    }
    const g = cut.current
    if (g) {
      const gh = (c.full - c.kept) * unit
      g.visible = gh > 1e-3
      g.scale.set(W, Math.max(0.001, gh), W)
      g.position.set(PX + X, PY + h + gh / 2, PZ)
    }
  })

  const ceilingY = n.ceiling * unit
  const keptPct = Math.round(n.kept - 100)
  return (
    <>
      <mesh ref={tower} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ACCENT_COLORS.stock} roughness={0.7} />
      </mesh>
      {/* 賣掉的上半截：空的（淡紅＋虛線框），看得到「本來會有、現在沒有」 */}
      <mesh ref={cut} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ACCENT_COLORS.loss} transparent opacity={0.14} depthWrite={false} />
        <Edges color={ACCENT_COLORS.loss} dashed dashSize={0.22} gapSize={0.14} lineWidth={1.5} />
      </mesh>
      {/* 起點 100 的框線：下跌時才畫（看得到塔一樣變矮）；上漲時賣掉的空框就是比較的基準 */}
      <mesh position={atPlaza(X, 50 * unit, 0)} visible={n.movePct < 0}>
        <boxGeometry args={[W + 0.1, 100 * unit, W + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={line} />
      </mesh>
      {/* 天花板：比塔寬的一圈虛線 */}
      <mesh position={atPlaza(X, ceilingY, 0)}>
        <boxGeometry args={[W + 1.6, 0.01, W + 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color={line} dashed dashSize={0.3} gapSize={0.2} lineWidth={2} depthTest={false} renderOrder={5} />
      </mesh>
      {/* 權利金：塔右邊一疊金幣（每 1% 一枚；不管漲跌都拿到） */}
      <instancedMesh ref={coins} args={[undefined, undefined, n.coins]} castShadow receiveShadow>
        <cylinderGeometry args={[coinR, coinR, coinT * 0.9, 40]} />
        <meshStandardMaterial color={ACCENT_COLORS.coin} metalness={0.6} roughness={0.35} />
      </instancedMesh>
      <Callout anchor={atPlaza(X + W / 2 + 0.8, ceilingY, 0)} offset={[2.6, -1.4, 0]} title={T.cc.ceiling(`${pctOf(COVERED_CALL.cap)}%`)} persistent />
      <Callout
        anchor={atPlaza(X, 0.1, W / 2)}
        offset={[-1.2, -0.3, 2.4]}
        title={T.cc.tower}
        sub={T.cc.signed(keptPct)}
        color={ACCENT_COLORS.stock}
        persistent
      />
      {n.cut > 0 && (
        <Callout
          anchor={atPlaza(X + W / 2, (n.kept + n.full) * 0.5 * unit, 0)}
          offset={[2.6, 1.6, 0]}
          title={T.cc.cut}
          sub={T.cc.signed(-pctOf(n.cut))}
          color={ACCENT_COLORS.loss}
          subColor={ACCENT_COLORS.loss}
          persistent
        />
      )}
      {sleeve && (
        <Callout anchor={atPlaza(X - W / 2, 0.1, -W / 2)} offset={[-3.4, 3.4, 0]} title={T.cc.fund(`${sleeve.pct.toFixed(1)}%`)} sub={T.cc.fundSub} color={ACCENT_COLORS.stock} persistent />
      )}
      <Callout anchor={atPlaza(coinX, 0.1, coinR)} offset={[0.8, -0.3, 2.4]} title={T.cc.coin} sub={T.cc.signed(Math.round(n.coin))} color={ACCENT_COLORS.coin} persistent />
    </>
  )
}
