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
