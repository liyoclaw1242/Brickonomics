import type { Asset, VerifiedKey } from './schema'

/** 查證狀態：細項 key（如 'fees.cdsc'）優先，其次總 key（'fees'），都沒有即未查證。 */
export function isVerified(asset: Asset, key: VerifiedKey): boolean {
  const v = asset.verified
  if (!v) return false
  const own = v[key]
  if (own !== undefined) return own
  const dot = key.indexOf('.')
  if (dot > 0) {
    const parent = v[key.slice(0, dot) as VerifiedKey]
    if (parent !== undefined) return parent
  }
  return false
}
