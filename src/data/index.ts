import stocks from './snapshot/stocks.json'
import buckets from './snapshot/buckets.json'
import etfs from './snapshot/etfs.json'
import funds from './snapshot/funds.json'
import { parseUniverse } from './universe'

export const SNAPSHOT_DATE = '2026-10-03'

export const universe = parseUniverse([...stocks, ...buckets, ...etfs, ...funds])

export type { Universe } from './universe'
export type { Asset, AssetType } from './schema'
export { isVerified } from './verified'
export type { VerifiedKey } from './schema'
