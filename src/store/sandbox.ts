import { create } from 'zustand'
import type { SliceAxis } from '../scene/layout/voxels'

export type Picked = { productId: string; holdingId: string } | null

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
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

export const useSandbox = create<SandboxState>()((set) => ({
  productId: '0050',
  sliceAxis: 'x',
  slice: 0,
  explode: 0,
  explodeHeld: false,
  picked: null,
  selectProduct: (id) => set({ productId: id, slice: 0, explode: 0, picked: null }),
  setSliceAxis: (a) => set({ sliceAxis: a }),
  setSlice: (v) => set({ slice: clamp01(v) }),
  setExplode: (v) => set({ explode: clamp01(v) }),
  setExplodeHeld: (held) => set({ explodeHeld: held }),
  pick: (p) => set({ picked: p }),
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
