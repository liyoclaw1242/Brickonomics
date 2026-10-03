import { z } from 'zod'

export const ASSET_TYPES = [
  'stock',
  'govBond',
  'corpBond',
  'highYieldBond',
  'convertible',
  'bondMixed', // 未細分的債券部位
  'gold',
  'cash',
  'other', // 持股中「其他」的彙總桶
  'etf',
  'fund',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

/**
 * 可標記查證狀態的欄位。`verified` 中缺少的 key 一律視為「未查證」。
 * 只有明確為 true 才可當成已查證事實呈現。
 * 同時有細項 key（如 `fees.cdsc`）與總 key（`fees`）時，細項優先；沒有細項才看總 key；都沒有即未查證。
 */
export const VERIFIED_KEYS = [
  'holdings',
  'fees',
  'fees.frontLoad',
  'fees.expenseRatio',
  'fees.distributionFee',
  'fees.cdsc',
  'distribution',
  'nameEn',
  'asOf',
] as const

export type VerifiedKey = (typeof VERIFIED_KEYS)[number]

const BASKET_TYPES: readonly AssetType[] = ['etf', 'fund']

const HoldingSchema = z.object({
  id: z.string().min(1),
  weightPct: z.number().positive().max(100),
})

const FeesSchema = z.object({
  frontLoad: z.number().min(0).max(0.1).optional(),
  expenseRatio: z.number().min(0).max(0.05).optional(),
  distributionFee: z.number().min(0).max(0.05).optional(),
  distributionFeeYears: z.number().int().positive().optional(), // 分銷費只收幾年；未填 = 持有期間都收
  cdsc: z.array(z.number().min(0).max(0.1)).optional(), // 第 1 年、第 2 年⋯的遞延手續費
})

export const AssetSchema = z
  .object({
    id: z.string().regex(/^[A-Z0-9_]+$/),
    name: z.string().min(1),
    nameEn: z.string().optional(),
    type: z.enum(ASSET_TYPES),
    region: z.enum(['TW', 'US', 'GLOBAL']).optional(),
    sector: z.string().optional(),
    domicile: z.enum(['onshore', 'offshore']).optional(),
    agent: z.string().optional(),
    holdings: z.array(HoldingSchema).optional(),
    fees: FeesSchema.optional(),
    distribution: z
      .object({
        frequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'none']),
        classes: z.array(z.enum(['accumulating', 'distributing'])).optional(),
      })
      .optional(),
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.array(z.string().min(1)),
    /** 彙總桶（其他股票、現金、混合債券等）：不代表特定標的，不納入重疊計算 */
    aggregate: z.boolean().optional(),
    verified: z.partialRecord(z.enum(VERIFIED_KEYS), z.boolean()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((a, ctx) => {
    const basket = BASKET_TYPES.includes(a.type)
    if (basket && !a.holdings?.length) {
      ctx.addIssue({ code: 'custom', path: ['holdings'], message: 'basket requires holdings' })
    }
    if (!basket && a.holdings) {
      ctx.addIssue({ code: 'custom', path: ['holdings'], message: 'only etf/fund may have holdings' })
    }
  })

export type Asset = z.infer<typeof AssetSchema>

export function isBasket(a: Asset): boolean {
  return BASKET_TYPES.includes(a.type)
}
