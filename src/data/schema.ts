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

const BASKET_TYPES: readonly AssetType[] = ['etf', 'fund']

const HoldingSchema = z.object({
  id: z.string().min(1),
  weightPct: z.number().positive().max(100),
})

const FeesSchema = z.object({
  frontLoad: z.number().min(0).max(0.1).optional(),
  expenseRatio: z.number().min(0).max(0.05).optional(),
  distributionFee: z.number().min(0).max(0.05).optional(),
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
    verified: z.record(z.string(), z.boolean()).optional(),
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
