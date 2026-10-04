import type { Asset } from '../data/schema'
import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { productLooks } from '../scene/palette'
import type { Picked } from '../store/sandbox'
import { displayName } from './names'
import { T } from './strings'

export function productGroups(u: Universe): { etfs: Asset[]; funds: Asset[] } {
  const all = [...u.values()]
  return { etfs: all.filter((a) => a.type === 'etf'), funds: all.filter((a) => a.type === 'fund') }
}

export type LegendRow = { id: string; name: string; weightPct: number; color: string; aggregate: boolean }

export function legendRows(u: Universe, productId: string): LegendRow[] {
  const p = u.get(productId)
  if (!p?.holdings) return []
  const looks = productLooks(u, productId)
  return p.holdings.map((h, i) => {
    const a = u.get(h.id)!
    return { id: h.id, name: displayName(u, h.id), weightPct: h.weightPct, color: looks[i]!.color, aggregate: a.aggregate ?? false }
  })
}

export function legendMeta(u: Universe, productId: string): { asOf: string; verified: boolean } | null {
  const p = u.get(productId)
  if (!p?.holdings) return null
  return { asOf: p.asOf, verified: isVerified(p, 'holdings') }
}

export const formatPct = (pct: number): string => `${pct.toFixed(2)}%`

export type PickInfo = {
  title: string
  subtitle: string
  weightPct: number | null
  asOf: string
  verified: boolean
  aggregate: boolean
  sources: string[]
}

export function pickInfo(u: Universe, picked: Picked): PickInfo | null {
  if (!picked) return null
  const product = u.get(picked.productId)
  const holding = u.get(picked.holdingId)
  if (!product || !holding) return null
  if (product.holdings) {
    const h = product.holdings.find((x) => x.id === holding.id)
    if (!h) return null
    return {
      title: displayName(u, holding.id),
      subtitle: T.partOf(product.name),
      weightPct: h.weightPct,
      asOf: product.asOf,
      verified: isVerified(product, 'holdings'),
      aggregate: holding.aggregate ?? false,
      sources: product.source,
    }
  }
  const region = holding.region ? T.regions[holding.region] : ''
  return {
    title: holding.name,
    subtitle: [region, holding.nameEn].filter(Boolean).join('・'),
    weightPct: null,
    asOf: holding.asOf,
    verified: isVerified(holding, 'marketCap'),
    aggregate: holding.aggregate ?? false,
    sources: holding.source,
  }
}

export function sourceLabel(s: string): { href: string | null; text: string } {
  if (!/^https?:\/\//i.test(s)) return { href: null, text: s }
  try {
    const u = new URL(s)
    return { href: s, text: u.hostname }
  } catch {
    return { href: null, text: s }
  }
}

/**
 * 「下一步」按鈕：等拉桿時按鈕自己說要做什麼（灰色、不是咖啡色），做完變回下一步（r3：暗掉的下一步像壞掉）。
 * name＝無障礙名稱：以看得到的字開頭（WCAG 2.5.3），也說出「下一步」。
 */
export function nextButton(canNext: boolean, isLast: boolean): { text: string; name: string; waiting: boolean } {
  if (!canNext) return { text: T.nextWaiting, name: T.nextWaitingName, waiting: true }
  const text = isLast ? T.finish : T.next
  return { text, name: text, waiting: false }
}
