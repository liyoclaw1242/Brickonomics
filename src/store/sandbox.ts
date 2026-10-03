import { create } from 'zustand'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import type { SliceAxis } from '../scene/layout/voxels'

export type Picked = { productId: string; holdingId: string } | null

export type SandboxPatch = {
  productId?: string | null
  sliceAxis?: SliceAxis
  slice?: number
  explode?: number
  picked?: Picked
}

type SandboxState = {
  productId: string | null
  sliceAxis: SliceAxis
  /** 切割量 0～1 */
  slice: number
  /** 拆開程度 0～1（拉桿） */
  explode: number
  /** 按住空白鍵時為 true，拆開程度視為 1 */
  explodeHeld: boolean
  picked: Picked
  selectProduct: (id: string | null) => void
  setSliceAxis: (a: SliceAxis) => void
  setSlice: (v: number) => void
  setExplode: (v: number) => void
  setExplodeHeld: (held: boolean) => void
  pick: (p: Picked) => void
  resetSandbox: () => void
  /** 關卡用：直接套用場景（同一商品也套用），不合法的商品丟 RangeError */
  applyScene: (p: SandboxPatch) => void
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

const INITIAL = {
  productId: '0050' as string | null,
  sliceAxis: 'x' as SliceAxis,
  slice: 0,
  explode: 0,
  explodeHeld: false,
  picked: null as Picked,
}

const isBasketId = (id: string) => {
  const a = universe.get(id)
  return !!a && isBasket(a)
}

export const useSandbox = create<SandboxState>()((set, get) => ({
  ...INITIAL,
  selectProduct: (id) => {
    if (id === get().productId) return
    if (id !== null && !isBasketId(id)) return
    set({ productId: id, slice: 0, explode: 0, picked: null })
  },
  setSliceAxis: (a) => set({ sliceAxis: a }),
  setSlice: (v) => set({ slice: clamp01(v) }),
  setExplode: (v) => set({ explode: clamp01(v) }),
  setExplodeHeld: (held) => set({ explodeHeld: held }),
  pick: (p) => set({ picked: p }),
  resetSandbox: () => set({ ...INITIAL }),
  applyScene: (p) => {
    const out: Partial<SandboxState> = {}
    if (p.productId !== undefined) {
      if (p.productId !== null && !isBasketId(p.productId)) throw new RangeError(`not a basket: ${p.productId}`)
      out.productId = p.productId
    }
    if (p.sliceAxis !== undefined) out.sliceAxis = p.sliceAxis
    if (p.slice !== undefined) out.slice = clamp01(p.slice)
    if (p.explode !== undefined) out.explode = clamp01(p.explode)
    if (p.picked !== undefined) out.picked = p.picked
    set(out)
  },
}))

export function effectiveExplode(s: { explode: number; explodeHeld: boolean }): number {
  return s.explodeHeld ? 1 : s.explode
}

export type SandboxInit = { productId?: string; sliceAxis?: SliceAxis; slice?: number; explode?: number }

/** 網址參數 → 初始狀態，例如 ?product=0050&axis=x&slice=0.5&explode=0（方便分享與截圖驗證） */
export function parseSandboxQuery(search: string, knownProducts: ReadonlySet<string>): SandboxInit {
  const q = new URLSearchParams(search)
  const out: SandboxInit = {}
  const product = q.get('product')
  if (product && knownProducts.has(product)) out.productId = product
  const axis = q.get('axis')
  if (axis === 'x' || axis === 'y' || axis === 'z') out.sliceAxis = axis
  for (const key of ['slice', 'explode'] as const) {
    const raw = q.get(key)
    if (raw === null) continue
    const n = Number(raw)
    if (Number.isFinite(n)) out[key] = clamp01(n)
  }
  return out
}
