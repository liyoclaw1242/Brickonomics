import { useSandbox, effectiveExplode } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import type { Quality } from './quality'
import { Basket } from './Basket'

const NO_FOCUS: string[] = []

type Props = { productId: string; quality: Quality; position: [number, number, number] }

/** 交易所的籃子：狀態來自 useSandbox；導覽模式的焦點持股來自目前步驟 */
export function BasketView({ productId, quality, position }: Props) {
  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  // LEVELS 裡的陣列是固定參考，selector 不會每次回傳新陣列
  const focusIds = useTour((s) => (s.mode === 'tour' ? (currentStep(s).focus?.holdings ?? NO_FOCUS) : NO_FOCUS))
  return (
    <Basket
      productId={productId}
      quality={quality}
      position={position}
      slice={slice}
      sliceAxis={sliceAxis}
      explode={explode}
      focusIds={focusIds}
      highlightId={picked?.productId === productId ? picked.holdingId : null}
      onPick={(holdingId) => pick({ productId, holdingId })}
    />
  )
}
