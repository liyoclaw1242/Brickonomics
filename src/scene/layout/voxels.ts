import type { BlockCount } from '../../sim/allocate'

export type SliceAxis = 'x' | 'y' | 'z' | 'd'
/** 格點座標；group 是持股在 holdings 中的索引 */
export type Voxel = { id: string; group: number; x: number; y: number; z: number }
export type CutSpec = { axis: SliceAxis; threshold: number }

/** 方塊縮小一點，留出縫隙看得出格線 */
export const VOXEL_SCALE = 0.92
/** 拆開時，每一組往上多移的距離（t = 1 時） */
export const EXPLODE_GAP = 1.5

/** 依序把各組方塊填進 w×d 的地板（先 x 再 z），滿一層往上疊（y）。同組方塊連續，切開會看到依權重厚薄的地層。 */
export function stackVoxels(counts: BlockCount[], w: number, d: number): Voxel[] {
  for (const [name, n] of [['w', w], ['d', d]] as const) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`${name} must be a positive integer: ${n}`)
  }
  const floor = w * d
  const out: Voxel[] = []
  let i = 0
  counts.forEach((c, group) => {
    for (let k = 0; k < c.count; k++, i++) {
      const r = i % floor
      out.push({ id: c.id, group, x: r % w, y: Math.floor(i / floor), z: Math.floor(r / w) })
    }
  })
  return out
}

export function layersFor(total: number, w: number, d: number): number {
  return Math.ceil(total / (w * d))
}

/** 格點 → 世界座標：x/z 以原點為中心，底面貼齊 y = 0 */
export function voxelPosition(v: Voxel, w: number, d: number): [number, number, number] {
  return [v.x - (w - 1) / 2, v.y + 0.5, v.z - (d - 1) / 2]
}

/** 拆開後整座塔的最大高度（世界單位），組數多時縮小間距以免超出畫面 */
export const MAX_EXPLODE_SPAN = 10

export function explodeGap(groups: number): number {
  return Math.min(EXPLODE_GAP, MAX_EXPLODE_SPAN / Math.max(1, groups - 1))
}

export function explodeOffsetY(group: number, t: number, groups: number): number {
  return group * explodeGap(groups) * t
}

/** 沿某軸的格點座標；斜切 'd' 用 x + z */
export function coordAlong(v: Voxel, axis: SliceAxis): number {
  return axis === 'd' ? v.x + v.z : v[axis]
}

export function sizeAlong(axis: SliceAxis, w: number, d: number, layers: number): number {
  if (axis === 'd') return w + d - 1
  return axis === 'x' ? w : axis === 'z' ? d : layers
}

/** 切割量 0（不切）～1（全切）→ 格點門檻：座標 ≥ 門檻的方塊被切掉 */
export function cutThreshold(size: number, amount: number): number {
  return size * (1 - Math.min(1, Math.max(0, amount)))
}

export function isHidden(v: Voxel, cut: CutSpec): boolean {
  return coordAlong(v, cut.axis) >= cut.threshold
}

/** 切面在該軸上的世界座標（保留與切掉的方塊之間的交界） */
export function cutPlanePosition(cut: CutSpec, w: number, d: number): number {
  if (cut.axis === 'x') return cut.threshold - w / 2
  if (cut.axis === 'z') return cut.threshold - d / 2
  if (cut.axis === 'd') return cut.threshold - (w + d - 1) / 2
  return cut.threshold
}

/** 指數趨近，用於動畫；dt 秒 */
export function approach(current: number, target: number, dt: number, rate = 8): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}

/** 情境衝擊用：每個持股依比例標出「該組最上方」的受損方塊（渲染時染紅），回傳受損方塊集合 */
export function damagedVoxels(voxels: Voxel[], damage: Readonly<Record<string, number>>): Set<Voxel> {
  const byId = new Map<string, Voxel[]>()
  for (const v of voxels) {
    const list = byId.get(v.id)
    if (list) list.push(v)
    else byId.set(v.id, [v])
  }
  const out = new Set<Voxel>()
  for (const [id, f] of Object.entries(damage)) {
    if (!Number.isFinite(f) || f < 0 || f > 1) throw new RangeError(`damage[${id}] must be in [0, 1]: ${f}`)
    const list = byId.get(id)
    if (!list) continue
    const n = Math.round(list.length * f)
    const top = [...list].sort((a, b) => b.y - a.y || b.z - a.z || b.x - a.x)
    for (const v of top.slice(0, n)) out.add(v)
  }
  return out
}
