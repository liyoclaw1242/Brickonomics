import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { currentStep, useTour } from '../../store/tour'
import { movePct, SHOCK_2330 } from '../../tour/context'
import { displayName } from '../../ui/names'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { Callout } from '../Callout'
import { CLOUD, CLOUD_LABEL_ANCHOR, SHOCK_DAMAGE, SHOCK_SUBJECTS, STOCK_BLOCKS, STOCK_W, STRIKE_END, isStruck, stockBlocksAfter } from '../layout/lightning'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { prefersReducedMotion, useRevealAfterCamera } from '../useRevealAfterCamera'
import { useContinuousRender } from '../useContinuousRender'
import { Lightning } from './Lightning'
import { atPlaza } from './plaza'
import { StormCloud } from './StormCloud'
import { VoxelColumn } from './VoxelColumn'

/**
 * 假設台積電下跌 30%：只買台積電、0050、SPY 並排比較，上面一片烏雲（c-1 還沒打）。
 * active（c-2）：鏡頭停下後一道閃電打下來（layout/lightning.ts），只分岔到台積電——只買台積電那柱、0050 裡的台積電層；
 * SPY 沒有台積電，沒被打到。打中那一刻才出現損傷（柱子變矮、0050 的紅色方塊）和跌幅標籤；終點與原本靜態的 active 畫面一樣。
 * 閃電只打一次：動畫結束後停止持續繪製，烏雲靜止。prefers-reduced-motion：直接顯示終點與一道靜止的閃電。
 */
export function ShockStage({ active, quality }: { active: boolean; quality: Quality }) {
  const stepId = useTour((s) => currentStep(s).id)
  const [still] = useState(prefersReducedMotion)
  const revealed = useRevealAfterCamera(stepId, still)
  const invalidate = useThree((s) => s.invalidate)
  /** 閃電時間（秒）：null＝還沒開始；Infinity＝終點 */
  const time = useRef<number | null>(active && still ? Infinity : null)
  const t0 = useRef<number | null>(null)
  const [struck, setStruck] = useState(active && still)
  const [running, setRunning] = useState(false)

  // 換步驟（c-1 ↔ c-2 共用這個元件）或鏡頭停下時重新開始：每次進入 c-2 只打一次
  useEffect(() => {
    t0.current = null
    time.current = active && still ? Infinity : null
    setStruck(active && still)
    setRunning(active && !still && revealed)
    invalidate()
  }, [active, still, revealed, invalidate])

  useContinuousRender(running)

  useFrame(({ clock }) => {
    if (!running) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const t = clock.elapsedTime - t0.current
    time.current = t
    if (!struck && isStruck(t)) setStruck(true)
    if (t > STRIKE_END) {
      setRunning(false)
      invalidate() // 最後一幀：光已退掉
    }
  })

  const hit = active && struck
  const damage = useMemo(() => (hit ? SHOCK_DAMAGE : undefined), [hit])
  const look = useMemo(() => lookFor(universe.get('2330')!), [])
  const stockCount = hit ? stockBlocksAfter : STOCK_BLOCKS
  return (
    <>
      <StormCloud quality={quality} position={atPlaza(...CLOUD.center)} spread={CLOUD.spread} size={CLOUD.size} />
      {active && <Lightning time={time} quality={quality} still={still} />}
      {hit && <Callout anchor={atPlaza(...CLOUD_LABEL_ANCHOR)} offset={[2.2, -0.8, 0]} title={T.shock.struck} persistent />}
      <VoxelColumn count={stockCount} look={look} position={atPlaza(SHOCK_SUBJECTS[0]!.x, 0, 0)} w={STOCK_W} d={STOCK_W} quality={quality} />
      <Basket productId="0050" quality="low" position={atPlaza(SHOCK_SUBJECTS[1]!.x, 0, 0)} slice={0} sliceAxis="x" explode={0} damage={damage} />
      <Basket productId="SPY" quality="low" position={atPlaza(SHOCK_SUBJECTS[2]!.x, 0, 0)} slice={0} sliceAxis="x" explode={0} />
      {SHOCK_SUBJECTS.map((s) => {
        const name = s.key === 'stock' ? T.shock.stock : displayName(universe, s.key)
        const pct = hit ? movePct(s.key === 'stock' ? SHOCK_2330['2330']! : shockImpact(universe, s.key, { ...SHOCK_2330 })) : ''
        return (
          <Callout
            key={s.key}
            anchor={atPlaza(s.x, 0.1, 4)}
            offset={[0, -0.3, 3]}
            // 衝擊後：跌幅當標題（用字說「跌 16.9%」，負號太細，r3）、名稱當副標（字塊窄，手機上三個並排不會互撞或超出畫面）
            title={hit ? pct : name}
            // 圖例（紅色＝假設跌掉的部分）併進中間那籃的副標
            sub={hit ? (s.key === '0050' ? T.shock.withLegend(name) : name) : undefined}
            // 衝擊發生後，帶圖例的那一籃屬於內容（關掉「標註」也留著）；三籃的跌幅都是內容
            persistent={hit}
          />
        )
      })}
    </>
  )
}
