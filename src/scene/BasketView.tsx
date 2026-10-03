import { useSandbox, effectiveExplode } from '../store/sandbox'
import type { Quality } from './quality'
import { Basket } from './Basket'

type Props = { productId: string; quality: Quality; position: [number, number, number] }

/** 沙盒的籃子：狀態來自 useSandbox */
export function BasketView({ productId, quality, position }: Props) {
  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  return (
    <Basket
      productId={productId}
      quality={quality}
      position={position}
      slice={slice}
      sliceAxis={sliceAxis}
      explode={explode}
      highlightId={picked?.productId === productId ? picked.holdingId : null}
      onPick={(holdingId) => pick({ productId, holdingId })}
    />
  )
}
