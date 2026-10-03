import { AssetSchema, type Asset } from './schema'

export type Universe = ReadonlyMap<string, Asset>

export const WEIGHT_TOLERANCE_PCT = 0.5

export class UniverseError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Invalid universe:\n${errors.join('\n')}`)
    this.name = 'UniverseError'
  }
}

export function parseUniverse(raw: unknown[]): Universe {
  const errors: string[] = []
  const map = new Map<string, Asset>()

  raw.forEach((item, i) => {
    const r = AssetSchema.safeParse(item)
    if (!r.success) {
      errors.push(`#${i}: ${r.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`)
      return
    }
    if (map.has(r.data.id)) {
      errors.push(`duplicate id ${r.data.id}`)
      return
    }
    map.set(r.data.id, r.data)
  })

  let refsOk = true
  for (const a of map.values()) {
    if (!a.holdings) continue
    const sum = a.holdings.reduce((s, h) => s + h.weightPct, 0)
    if (Math.abs(sum - 100) > WEIGHT_TOLERANCE_PCT) {
      errors.push(`${a.id}: holdings sum ${sum.toFixed(2)}% (expected 100±${WEIGHT_TOLERANCE_PCT})`)
    }
    for (const h of a.holdings) {
      if (!map.has(h.id)) {
        errors.push(`${a.id}: unknown holding ${h.id}`)
        refsOk = false
      }
    }
  }

  if (refsOk) errors.push(...findCycles(map))
  if (errors.length) throw new UniverseError(errors)
  return map
}

function findCycles(map: Map<string, Asset>): string[] {
  const state = new Map<string, 'visiting' | 'done'>()
  const found: string[] = []
  const visit = (id: string, path: string[]) => {
    const s = state.get(id)
    if (s === 'done') return
    if (s === 'visiting') {
      found.push(`cycle: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`)
      return
    }
    state.set(id, 'visiting')
    for (const h of map.get(id)?.holdings ?? []) visit(h.id, [...path, id])
    state.set(id, 'done')
  }
  for (const id of map.keys()) visit(id, [])
  return found
}
