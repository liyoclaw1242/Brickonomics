import { z } from 'zod'
import lu2347655073 from './snapshot/practice/LU2347655073.json'

/**
 * 實戰課（Plan 9）的基金體檢資料：一檔真基金的快照（規格 2026-10-06-fund-checkup-design §3）。
 * 每個欄位都是 { value, source:{url, doc, date}, verified }：value 查不到時為 null；source.date＝那份文件的資料日期。
 * 只用一手來源（基金公司月報、公開說明書／投資人須知、KID、官網配息公告）；第三方網站不引用、不作為出處。
 * 載入時 zod 驗證（壞資料直接丟錯，build 前的 vitest src/data 會擋下）。
 */

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const MONTH = z.string().regex(/^\d{4}-\d{2}$/)

export const SourceSchema = z.strictObject({ url: z.url(), doc: z.string().min(1), date: ISO_DATE })
export type CheckupSource = z.infer<typeof SourceSchema>

/** 一個體檢欄位：值（查不到＝null）＋出處＋有沒有查證過 */
const field = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), source: SourceSchema, verified: z.boolean(), note: z.string().optional() })

const zhEn = z.strictObject({ zh: z.string().min(1), en: z.string().min(1) })
const pct = z.number().min(0).max(100)
/** 年費率（%／年），例如 1.25 */
const ratePct = z.number().min(0).max(10)

/**
 * 資產大類的「實際內容」（資料只寫事實；怎麼併成股票／借據／現金三大類寫在 sim/checkup 的 ASSET_GROUP_OF）：
 * equity＝股票、coveredCall＝股票＋賣出買權、highYield＝非投資等級（高收益）債、bond＝其他債券、preferred＝特別股、cash＝現金
 */
export const ASSET_KINDS = ['equity', 'coveredCall', 'highYield', 'bond', 'preferred', 'cash'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

const share = z.strictObject({ name: z.string().min(1), zh: z.string().min(1), pct })
const assetShare = share.extend({ kind: z.enum(ASSET_KINDS) })

/** 合計要接近 100（四捨五入，±0.5） */
const sumsTo100 = (items: readonly { pct: number }[]) => Math.abs(items.reduce((s, i) => s + i.pct, 0) - 100) <= 0.5 + 1e-9
const ascending = (dates: readonly string[]) => dates.every((d, i) => i === 0 || d > dates[i - 1]!)

const yearPct = z.strictObject({ year: z.number().int().min(1990).max(2100), pct: z.number().min(-100).max(1000) })

export const FundCheckupSchema = z.strictObject({
  id: z.string().regex(/^[A-Z0-9_]+$/),
  researchedOn: ISO_DATE,
  basics: z.strictObject({
    shareClassName: field(zhEn),
    isin: field(z.string().regex(/^[A-Z]{2}[A-Z0-9]{10}$/)),
    managementCompany: field(zhEn),
    taiwanMasterAgent: field(z.string().min(1)),
    domicile: field(z.string().min(1)),
    currency: field(z.string().regex(/^[A-Z]{3}$/)),
    inceptionDate: field(ISO_DATE),
    /** 整檔基金（所有級別合計）的規模，不是這個級別 */
    fundSize: field(z.strictObject({ amount: z.number().positive(), unit: z.literal('USD million'), scope: z.string().min(1), asOf: ISO_DATE })),
    /** 台灣的風險報酬等級 RR1–RR5 */
    riskLevelTW: field(z.enum(['RR1', 'RR2', 'RR3', 'RR4', 'RR5'])),
    /** 歐盟 KID 的綜合風險指標 1–7 */
    sri: field(z.number().int().min(1).max(7)),
    distributionFrequency: field(z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'none'])),
    managementFee: field(ratePct),
    /** 保管費（或行政管理費）：投資人須知寫的是上限（Max） */
    custodyAdminFee: field(ratePct),
    /** 最高申購手續費（實際看通路） */
    maxSalesCharge: field(ratePct),
    /** KID 的每年持續費用（經理費＋行政、營運成本） */
    ongoingCharges: field(ratePct),
    /** KID 估的每年交易成本（另外算） */
    transactionCosts: field(ratePct),
  }),
  assetAllocation: field(z.strictObject({ asOf: ISO_DATE, items: z.array(assetShare).min(1) }).refine((v) => sumsTo100(v.items), 'asset allocation must sum to 100 ± 0.5')),
  regionAllocation: field(z.strictObject({ asOf: ISO_DATE, items: z.array(share).min(1) }).refine((v) => sumsTo100(v.items), 'region allocation must sum to 100 ± 0.5')),
  topHoldings: field(z.strictObject({ asOf: ISO_DATE, items: z.array(z.strictObject({ name: z.string().min(1), type: z.string().min(1), pct })) })),
  coveredCallSleeve: field(z.strictObject({ label: z.string().min(1), pct, asOf: ISO_DATE, relatedHolding: z.string().min(1), description: z.string().min(1).nullable() })),
  navMonthEnd: field(
    z
      .strictObject({
        currency: z.string().regex(/^[A-Z]{3}$/),
        /** 起點（第一個月之前的月底） */
        baseline: z.strictObject({ date: ISO_DATE, nav: z.number().positive() }),
        items: z.array(z.strictObject({ date: ISO_DATE, nav: z.number().positive() })).min(1),
      })
      .refine((v) => ascending([v.baseline.date, ...v.items.map((i) => i.date)]), 'NAV dates must ascend'),
  ),
  dividends: field(
    z
      .strictObject({
        currency: z.string().regex(/^[A-Z]{3}$/),
        items: z
          .array(z.strictObject({ recordDate: ISO_DATE, exDate: ISO_DATE, payDate: ISO_DATE, amount: z.number().positive(), annualisedYieldPct: pct }))
          .min(1),
      })
      .refine((v) => ascending(v.items.map((i) => i.recordDate)), 'record dates must ascend'),
  ),
  /** 年化配息率：配出去的比例，不是報酬 */
  annualisedDividendYield: field(z.strictObject({ pct, forRecordDate: ISO_DATE })),
  /** 配息組成：可分配淨利益 ÷ 配息、本金 ÷ 配息（台灣的表把每次配息標在基準日的前一個月） */
  dividendComposition: field(
    z.strictObject({
      basis: z.string().min(1),
      items: z
        .array(z.strictObject({ twMonthLabel: MONTH, amount: z.number().positive(), incomePct: pct, capitalPct: pct }).refine((r) => r.incomePct + r.capitalPct === 100, 'income + capital must be 100'))
        .min(1),
    }),
  ),
  annualDistributionsHistory: field(z.strictObject({ currency: z.string().regex(/^[A-Z]{3}$/), items: z.array(z.strictObject({ year: z.number().int(), amount: z.number().positive() })) })),
  /** 曆年報酬（原幣、含配息再投入） */
  calendarYearReturns: field(z.strictObject({ currency: z.string().regex(/^[A-Z]{3}$/), items: z.array(yearPct).min(1), ytd: z.strictObject({ pct: z.number(), asOf: ISO_DATE }) })),
  /** 基金自己選的指標（一手來源有寫才放） */
  benchmarkCalendarYearReturns: field(z.strictObject({ name: z.string().min(1), items: z.array(yearPct).min(1), ytd: z.strictObject({ pct: z.number(), asOf: ISO_DATE }) })),
})

export type FundCheckup = z.infer<typeof FundCheckupSchema>
export type CheckupField = { value: unknown; source: CheckupSource; verified: boolean }

/** 體檢欄位的路徑：最上層（如 'dividends'）或基本資料（如 'basics.ongoingCharges'） */
export type BasicsKey = keyof FundCheckup['basics']
export type TopKey = Exclude<keyof FundCheckup, 'id' | 'researchedOn' | 'basics'>
export type CheckupKey = TopKey | `basics.${BasicsKey}`

export function parseFundCheckup(raw: unknown): FundCheckup {
  return FundCheckupSchema.parse(raw)
}

/** 依路徑取欄位 */
export function checkupField(f: FundCheckup, key: CheckupKey): CheckupField {
  if (key.startsWith('basics.')) return f.basics[key.slice('basics.'.length) as BasicsKey]
  return f[key as TopKey]
}

/** 這個欄位能不能當成已查證的事實（明確 verified 而且有值） */
export function checkupVerified(f: FundCheckup, key: CheckupKey): boolean {
  const x = checkupField(f, key)
  return x.verified && x.value !== null
}

/** 實戰課的基金（載入時驗證） */
export const CHECKUPS: ReadonlyMap<string, FundCheckup> = new Map([lu2347655073].map((raw) => {
  const f = parseFundCheckup(raw)
  return [f.id, f] as const
}))

export function checkupOf(id: string): FundCheckup {
  const f = CHECKUPS.get(id)
  if (!f) throw new Error(`no checkup data for ${id}`)
  return f
}
