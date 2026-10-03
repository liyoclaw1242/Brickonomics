export type Quality = 'high' | 'low'
export type BoxSpec = { w: number; d: number; total: number }
export type QualityConfig = { etf: BoxSpec; fund: BoxSpec; shadows: boolean; dpr: [number, number] }

/** ETF 是立方體（交易所櫃台上的混合方塊），基金是細長小塔 */
export const QUALITY: Record<Quality, QualityConfig> = {
  high: { etf: { w: 10, d: 10, total: 1000 }, fund: { w: 6, d: 6, total: 504 }, shadows: true, dpr: [1, 2] },
  low: { etf: { w: 7, d: 7, total: 343 }, fund: { w: 4, d: 4, total: 160 }, shadows: false, dpr: [1, 1.5] },
}

export function detectQuality(env: { coarsePointer: boolean; cores: number | undefined }): Quality {
  return env.coarsePointer || (env.cores ?? 8) <= 4 ? 'low' : 'high'
}

export function readEnv(): { coarsePointer: boolean; cores: number | undefined } {
  return {
    coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
  }
}
