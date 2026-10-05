import { Color } from 'three'
import type { Asset } from '../data/schema'
import type { Universe } from '../data/universe'

export type MaterialKind = 'matte' | 'metal' | 'diamond' | 'glass' | 'gold'
export type BlockLook = { color: string; kind: MaterialKind }

export const SECTOR_COLORS: Record<string, string> = {
  semiconductor: '#4f7cff',
  electronics: '#2bb3a3',
  software: '#8a5cf6',
  internet: '#f06292',
  auto: '#ff8a3d',
  finance: '#5c6bc0',
}

const FALLBACK_STOCK = '#90a4ae'

/**
 * 課文顏色鍵與 3D 物體共用的顏色：coin＝金幣、loss＝損失紅；
 * profit＝公司每年賺的錢（s-pe 的淺綠薄片，不發給你，所以不是金幣）；units＝定期定額每月買到的方塊（e-dca）；
 * 高階（Plan 8）：stock／bond＝組合塔的股票、債券那一截（a-port、a-rebal）；
 * together／opposite＝a-corr 裡和 A 一起動、一上一下的那一顆；short／long＝a-dur 的 2 年、20 年借據
 */
export const ACCENT_COLORS = { coin: '#ffd54f', loss: '#e53935', profit: '#9ccc65', units: '#2bb3a3', stock: '#5b8def', bond: '#b9c9dc', together: '#b388ff', opposite: '#4dd0a1', short: '#f48fb1', long: '#e0a43a' } as const
const isAccent = (k: string): k is keyof typeof ACCENT_COLORS => Object.hasOwn(ACCENT_COLORS, k)

/** 股票依產業上色；債券用材質表示信用品質（國家債鑽石、公司債金屬、高收益債玻璃）。 */
export function lookFor(asset: Asset): BlockLook {
  switch (asset.type) {
    case 'stock':
      return { color: SECTOR_COLORS[asset.sector ?? ''] ?? FALLBACK_STOCK, kind: 'matte' }
    case 'govBond':
      return { color: '#d8f3ff', kind: 'diamond' }
    case 'corpBond':
      return { color: '#b0bec5', kind: 'metal' }
    case 'bondMixed':
      return { color: '#9fb3c8', kind: 'metal' }
    case 'highYieldBond':
      return { color: '#ffcc80', kind: 'glass' }
    case 'convertible':
      return { color: '#80cbc4', kind: 'metal' }
    case 'gold':
      return { color: '#ffd54f', kind: 'gold' }
    case 'cash':
      return { color: '#c5e1a5', kind: 'matte' }
    case 'other':
      return { color: '#cfd8dc', kind: 'matte' }
    case 'etf':
    case 'fund':
      return { color: '#ffffff', kind: 'matte' }
  }
}

const LIGHTNESS_STEP = 0.12

/** 同一籃子內，同色的第 n 個（n ≥ 1）依序調亮、調暗，讓每一層地層都分得出來。 */
export function basketLooks(assets: Asset[]): BlockLook[] {
  const used = new Map<string, number>()
  return assets.map((asset) => {
    const look = lookFor(asset)
    const n = used.get(look.color) ?? 0
    used.set(look.color, n + 1)
    if (n === 0) return look
    const step = Math.ceil(n / 2) * LIGHTNESS_STEP
    const c = new Color(look.color).offsetHSL(0, 0, n % 2 === 1 ? step : -step)
    return { ...look, color: `#${c.getHexString()}` }
  })
}

export function productLooks(u: Universe, productId: string): BlockLook[] {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return basketLooks(
    p.holdings.map((h) => {
      const a = u.get(h.id)
      if (!a) throw new Error(`unknown asset ${h.id}`)
      return a
    }),
  )
}

/** 課文顏色鍵 → 顏色：coin／loss、產業 id（SECTOR_COLORS）、或持股／資產 id（lookFor）。未知鍵回傳 undefined。 */
export function colorForKey(u: Universe, key: string): string | undefined {
  if (isAccent(key)) return ACCENT_COLORS[key]
  if (Object.hasOwn(SECTOR_COLORS, key)) return SECTOR_COLORS[key]
  const asset = u.get(key)
  return asset ? lookFor(asset).color : undefined
}

/** 籃子裡某持股實際畫出來的顏色（含同色調亮／調暗）；不在籃子裡就退回 colorForKey */
export function holdingColor(u: Universe, productId: string, holdingId: string): string | undefined {
  const holdings = u.get(productId)?.holdings
  const i = holdings ? holdings.findIndex((h) => h.id === holdingId) : -1
  return i >= 0 ? productLooks(u, productId)[i]!.color : colorForKey(u, holdingId)
}
