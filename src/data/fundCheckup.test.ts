import { describe, it, expect } from 'vitest'
import raw from './snapshot/practice/LU2347655073.json'
import { CHECKUPS, checkupField, checkupOf, checkupVerified, parseFundCheckup, type CheckupKey } from './fundCheckup'

const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
const f = checkupOf('LU2347655073')

describe('FundCheckup schema', () => {
  it('loads the LU2347655073 snapshot and registers it by id', () => {
    expect(CHECKUPS.has('LU2347655073')).toBe(true)
    expect(f.basics.isin.value).toBe('LU2347655073')
    expect(() => checkupOf('NOPE')).toThrow(/NOPE/)
  })

  it('every field carries a source (url, document, date) and a verified flag', () => {
    const fields = [...Object.values(f.basics), ...Object.entries(f).filter(([k]) => !['id', 'researchedOn', 'basics'].includes(k)).map(([, v]) => v)]
    expect(fields.length).toBeGreaterThan(20)
    for (const x of fields as { source: { url: string; doc: string; date: string }; verified: boolean }[]) {
      expect(x.source.url).toMatch(/^https:\/\//)
      expect(x.source.doc.length).toBeGreaterThan(0)
      expect(x.source.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(typeof x.verified).toBe('boolean')
    }
  })

  it('rejects a field without a source, unknown keys, allocations that do not add up and a broken composition row', () => {
    const noSource = clone()
    delete (noSource.basics as Record<string, Record<string, unknown>>).isin!.source
    expect(() => parseFundCheckup(noSource)).toThrow()
    const extra = clone()
    extra.thirdPartyCode = 'x'
    expect(() => parseFundCheckup(extra)).toThrow()
    const off = clone()
    ;(off.assetAllocation as { value: { items: { pct: number }[] } }).value.items[0]!.pct = 40 // 29.0 → 40：合計 110.9
    expect(() => parseFundCheckup(off)).toThrow(/sum to 100/)
    const comp = clone()
    ;(comp.dividendComposition as { value: { items: { incomePct: number }[] } }).value.items[0]!.incomePct = 90 // 90 + 0 ≠ 100
    expect(() => parseFundCheckup(comp)).toThrow(/income \+ capital/)
    const order = clone()
    const nav = (order.navMonthEnd as { value: { items: { date: string }[] } }).value.items
    ;[nav[0]!.date, nav[1]!.date] = [nav[1]!.date, nav[0]!.date]
    expect(() => parseFundCheckup(order)).toThrow(/ascend/)
  })

  it('allows null for a value nobody could verify (the covered-call one-liner)', () => {
    expect(f.coveredCallSleeve.value!.description).toBeNull()
    const gone = clone()
    ;(gone.topHoldings as { value: unknown }).value = null
    expect(parseFundCheckup(gone).topHoldings.value).toBeNull()
  })

  it('checkupVerified: true only when the flag is true and the value is not null', () => {
    expect(checkupVerified(f, 'basics.ongoingCharges')).toBe(true)
    expect(checkupVerified(f, 'dividends')).toBe(true)
    const off = clone()
    ;(off.dividends as { verified: boolean }).verified = false
    expect(checkupVerified(parseFundCheckup(off), 'dividends')).toBe(false)
    const empty = clone()
    ;(empty.topHoldings as { value: unknown }).value = null
    expect(checkupVerified(parseFundCheckup(empty), 'topHoldings')).toBe(false)
    expect(checkupField(f, 'basics.sri' as CheckupKey).value).toBe(3)
  })

  it('records the facts the course relies on, from primary sources', () => {
    // 整檔基金規模（所有級別），不是這個級別
    expect(f.basics.fundSize.value).toMatchObject({ amount: 22185.5, unit: 'USD million', asOf: '2026-08-31' })
    expect(f.basics.fundSize.value!.scope).toContain('whole')
    // KID 的 SRI 3/7、台灣 RR3（TW 網頁資料的 4 和 KID 衝突，不用）
    expect(f.basics.riskLevelTW.value).toBe('RR3')
    expect(f.basics.sri.value).toBe(3)
    expect(f.basics.ongoingCharges.value).toBe(1.45)
    expect(f.basics.transactionCosts.value).toBe(0.22)
    expect(f.navMonthEnd.value!.baseline).toEqual({ date: '2025-09-30', nav: 74.99 })
    expect(f.navMonthEnd.value!.items.at(-1)).toEqual({ date: '2026-09-30', nav: 72.87 })
    expect(f.dividends.value!.items).toHaveLength(12)
    expect(f.dividendComposition.value!.items).toHaveLength(12)
  })

  it('never names the third-party site or its fund code: not in the snapshot, the sources or any source file; the data id is the ISIN', () => {
    expect(JSON.stringify(raw)).not.toMatch(/moneydj|jfzn3/i)
    // 所有原始碼（含這份 JSON、strings、課文）與資料來源文件；這支測試自己（正規式裡有這個字）除外
    const files = import.meta.glob(['../**/*.{ts,tsx,json,css}', '!./fundCheckup.test.ts', '../../docs/data-sources.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(files).length).toBeGreaterThan(50)
    expect(Object.keys(files).some((p) => p.endsWith('data-sources.md'))).toBe(true)
    expect(Object.entries(files).filter(([, text]) => /moneydj|jfzn3/i.test(text)).map(([p]) => p)).toEqual([])
    // 資料 id ＝ ISIN（不用第三方網站的代碼）
    expect(f.id).toBe(f.basics.isin.value)
  })
})
