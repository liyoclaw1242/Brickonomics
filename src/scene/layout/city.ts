import type { Asset } from '../../data/schema'

export const HEIGHT = { min: 2, perDecade: 6, fallback: 3 } as const
export const BUILDING_SPACING = 4
export const ISLAND_CENTERS = { TW: [-16, 0], US: [16, 0] } as const

export type Region = 'TW' | 'US'
export type Placement = { id: string; region: Region; x: number; z: number; height: number }
export type BuildingVoxel = { id: string; x: number; y: number; z: number }

/** 大樓層數 = 市值的對數比例：100 億美元 2 層，每多 10 倍加 6 層 */
export function buildingHeight(capUsdB: number | undefined): number {
  if (capUsdB === undefined) return HEIGHT.fallback
  if (!Number.isFinite(capUsdB) || capUsdB <= 0) throw new RangeError(`capUsdB must be a positive number: ${capUsdB}`)
  return Math.max(HEIGHT.min, Math.round(HEIGHT.min + HEIGHT.perDecade * Math.log10(capUsdB / 10)))
}

/** 每座島排成方陣，最高的排最前面 */
export function cityLayout(assets: Asset[]): Placement[] {
  const out: Placement[] = []
  for (const region of ['TW', 'US'] as const) {
    const list = assets
      .filter((a) => a.type === 'stock' && a.region === region)
      .map((a) => ({ id: a.id, height: buildingHeight(a.marketCapUsdB) }))
      .sort((a, b) => b.height - a.height || a.id.localeCompare(b.id))
    const cols = Math.ceil(Math.sqrt(list.length))
    const rows = Math.ceil(list.length / cols)
    const [cx, cz] = ISLAND_CENTERS[region]
    list.forEach((b, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      out.push({
        ...b,
        region,
        x: cx + (col - (cols - 1) / 2) * BUILDING_SPACING,
        z: cz + (row - (rows - 1) / 2) * BUILDING_SPACING,
      })
    })
  }
  return out
}

/** 島的邊長（正方形），容得下 count 棟大樓再加邊界 */
export function islandSize(count: number): number {
  return Math.ceil(Math.sqrt(Math.max(1, count))) * BUILDING_SPACING + 4
}

/** 每棟大樓是 2×2 地基、height 層高的方塊柱 */
export function buildingVoxels(placements: Placement[]): BuildingVoxel[] {
  const out: BuildingVoxel[] = []
  for (const p of placements) {
    for (let y = 0; y < p.height; y++) {
      for (const dx of [-0.5, 0.5]) {
        for (const dz of [-0.5, 0.5]) out.push({ id: p.id, x: p.x + dx, y: y + 0.5, z: p.z + dz })
      }
    }
  }
  return out
}

/**
 * 假設情境：市值乘以 (1 − f) 後，依對數高度比例重算層數，至少保留 1 層。
 * 查不到市值的資產退回單純把層數乘以 (1 − f)。
 */
export function applyShrink(
  placements: Placement[],
  shrink: Readonly<Record<string, number>>,
  capOf: (id: string) => number | undefined = () => undefined,
): Placement[] {
  return placements.map((p) => {
    const f = shrink[p.id]
    if (f === undefined) return p
    const cap = capOf(p.id)
    if (f >= 1) return { ...p, height: 1 }
    const height = cap === undefined ? Math.round(p.height * (1 - f)) : buildingHeight(cap * (1 - f))
    return { ...p, height: Math.max(1, height) }
  })
}

/** 每座島最高的 perIsland 棟（同高依 cityLayout 的順序）＋ extra（選到、被標註的大樓）才顯示名稱 */
export function labeledBuildings(placements: readonly Placement[], perIsland: number, extra: Iterable<string> = []): Set<string> {
  const out = new Set<string>(extra)
  for (const region of ['TW', 'US'] as const) {
    // cityLayout 已依高度排序；stable sort 再保險一次
    const list = placements.filter((p) => p.region === region).sort((a, b) => b.height - a.height)
    for (const p of list.slice(0, perIsland)) out.add(p.id)
  }
  return out
}

/** 城市名稱每座島最多標幾棟（r3：5 棟還是擠成一團） */
export const CITY_LABELS_PER_ISLAND = 3

/** 螢幕上的標籤框（像素，x/y＝中心）；behind＝錨點在鏡頭後面 */
export type LabelBox = { id: string; x: number; y: number; w: number; h: number; behind?: boolean }

/** 名稱標籤的寬度估計（像素）：中文字約 15px、英數約 8.5px，加左右留白 */
export function labelWidth(text: string): number {
  return Array.from(text).reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 8.5 : 15), 12)
}

const overlaps = (a: LabelBox, b: LabelBox, pad: number) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2

/**
 * 依優先順序放名稱：跟已放的名稱或步驟標註（obstacles）疊到就不放。
 * forced（選到的大樓）一定放；回傳要顯示的 id（依原順序）。
 */
export function declutterLabels(candidates: readonly LabelBox[], obstacles: readonly LabelBox[] = [], forced: ReadonlySet<string> = new Set(), pad = 3): string[] {
  const placed: LabelBox[] = candidates.filter((c) => forced.has(c.id) && !c.behind)
  const blockers = [...obstacles.filter((o) => !o.behind), ...placed]
  for (const c of candidates) {
    if (c.behind || forced.has(c.id)) continue
    if (blockers.some((b) => overlaps(c, b, pad))) continue
    placed.push(c)
    blockers.push(c)
  }
  const keep = new Set(placed.map((p) => p.id))
  return candidates.filter((c) => keep.has(c.id)).map((c) => c.id)
}
