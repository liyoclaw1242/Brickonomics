import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { overlap } from '../sim/overlap'
import { EXDIV_AFTER_PHASE, LEVELS } from './levels'
import { accumulateVsPayout } from '../scene/layout/stages'
import { COURSES, courseSteps, STEP_POOL } from './courses'
import { ON_PLAZA } from '../scene/stage/plaza'
import { maxDrawdown } from '../sim/drawdown'
import { DD_DEMO, DD_LAYOUT, ddBarX, peYears } from '../scene/layout/intermediate'
import { stageReadout } from '../ui/readout'
import { exDivTimeline, principalTrap } from '../scene/layout/stages'
import { towerTexts, trapTowerSpec } from '../scene/layout/towers'
import { makeTextContext, pct0, wan } from './context'
import { controlRange, DEFAULT_VALUES, lineOf, moreOf } from './engine'
import { ACTION_VERBS, forbiddenWordsIn, jargonIn, LINE_SENTENCE_MAX, LINE_SENTENCES_MAX, MORE_SENTENCE_MAX, MORE_SENTENCES_MAX, sentences } from './glossary'
import { parseEmphasis, stripMarkup, visibleLength } from '../ui/emphasis'
import { colorForKey } from '../scene/palette'
import { isVerified } from '../data/verified'
import { T } from '../ui/strings'
import { CAMERA_PRESETS } from '../scene/camera'
import { stepMarks } from '../ui/marks'
import type { VerifiedKey } from '../data/schema'
import type { Universe } from '../data'
import type { Stage, StageValues, Step } from './types'

const ctx = makeTextContext(universe)
/** 規則測試遍歷整個步驟池（LEVELS＋課程專用的新步驟 m-0、m-fin） */
const steps = [...STEP_POOL.values()]
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'exchangeWide', 'exchangeSide', 'plaza', 'plazaNear', 'underground']

/** 測試用：把指定產品的查證旗標清空（模擬「資料尚待查證」），驗證 ？ 的判斷邏輯仍然有效 */
const unverify = (ids: string[]): Universe => {
  const m = new Map(universe)
  for (const id of ids) m.set(id, { ...m.get(id)!, verified: {} })
  return m
}

const byId = (id: string): Step => steps.find((s) => s.id === id)!
/** Plan 7 的舉例舞台：一定要標 ≈、多說一點寫「示意」 */
const PLAN7_STAGES: string[] = ['drawdown', 'pe', 'seesaw', 'dca', 'inflation']
/** Plan 8 的高階舞台：都是舉例（≈、多說一點寫「示意」） */
const PLAN8_STAGES: string[] = ['portfolio', 'correlation', 'dayTrade', 'duration', 'feeTrees', 'leverage', 'hedge', 'rebalance']
/** 大數字跟著即時拉桿值；測試預設用進入該步驟時的值 */
const bigOf = (s: Step, values: Partial<StageValues> = {}) => s.bigNumber?.(ctx, { ...DEFAULT_VALUES, ...s.scene.values, ...values })
const resolve = (t: Step['line'] | undefined): string | undefined => (t === undefined ? undefined : typeof t === 'function' ? t(ctx) : t)

const assetsIn = (s: Stage): string[] => {
  if (s.kind === 'held') return s.items.map((i) => i.assetId)
  if (s.kind === 'overlap') return [s.a, s.b]
  if (s.kind === 'underground') return s.cores ?? []
  return []
}

describe('LEVELS', () => {
  it('has the prologue plus six levels in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'scenario', 'underground'])
    for (const l of LEVELS) expect(l.steps.length, l.id).toBeGreaterThan(0)
  })

  it('uses unique step ids', () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
  })

  it('references only valid presets, baskets and assets', () => {
    for (const s of steps) {
      expect(PRESETS, s.id).toContain(s.scene.camera)
      if (s.scene.cameraFrom) expect(PRESETS, s.id).toContain(s.scene.cameraFrom)
      if (s.scene.product) expect(isBasket(universe.get(s.scene.product)!), s.id).toBe(true)
      if (s.scene.stage) for (const id of assetsIn(s.scene.stage)) expect(universe.has(id), `${s.id}:${id}`).toBe(true)
    }
  })

  it('only waits on controls the step exposes', () => {
    for (const s of steps) if (s.until) expect(s.controls ?? [], s.id).toContain(s.until.control)
  })

  it('keeps the e-3 premise true: 2330 is 0050\'s largest holding and 2454 the second largest', () => {
    // OTHER_* 是「其他」彙總部位，不是單一公司
    const sorted = universe.get('0050')!.holdings!.filter((h) => !h.id.startsWith('OTHER')).sort((a, b) => b.weightPct - a.weightPct)
    expect(sorted[0]!.id).toBe('2330')
    expect(sorted[1]!.id).toBe('2454')
  })

  it('derives the shock percentage in c-1 and c-2 from SHOCK_2330', () => {
    expect(lineOf(byId('c-1'), ctx)).toContain('跌 **30%**') // 0.3 × 100
    expect(moreOf(byId('c-1'), ctx)).toContain('跌 30%')
    expect(moreOf(byId('c-2'), ctx)).toContain('只買台積電：−30.0%')
    expect(bigOf(byId('c-2'))!.fraction).toBeCloseTo(0.5631, 4) // 0.16893 / 0.3
    // 色條的滿格＝只買台積電的跌幅：要寫出來，不然「跌 16.9%」配一條 56% 的條會誤會
    expect(bigOf(byId('c-2'))!.note).toBe('整條＝只買台積電跌 30%')
  })

  it('renders every text without errors, non-empty, and never mentions 稅', () => {
    for (const s of steps) {
      expect(s.title.length, s.id).toBeGreaterThan(0)
      expect(lineOf(s, ctx).length, s.id).toBeGreaterThan(3)
      expect(moreOf(s, ctx).length, s.id).toBeGreaterThan(10)
      const all = [s.title, lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore)]
      const bn = bigOf(s)
      if (bn) all.push(bn.value, bn.label)
      for (const c of s.callouts ?? []) all.push(resolve(c.title), resolve(c.sub))
      for (const t of all) if (t !== undefined) expect(t, s.id).not.toContain('稅')
    }
  })

  it('every step has a short title and one short line', () => {
    for (const s of steps) {
      expect(Array.from(s.title).length, s.id).toBeLessThanOrEqual(8)
      expect(visibleLength(lineOf(s, ctx)), s.id).toBeLessThanOrEqual(20)
      expect((s.callouts ?? []).length, s.id).toBeLessThanOrEqual(2)
    }
  })

  it('illustrative stages carry the illustrative mark', () => {
    const illustrative = new Set(['exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker', ...PLAN7_STAGES, ...PLAN8_STAGES])
    for (const s of steps) {
      const st = s.scene.stage
      const needs =
        (st && illustrative.has(st.kind)) ||
        (st?.kind === 'held' && st.items.some((i) => i.motion !== 'still')) ||
        (st?.kind === 'underground' && ['dig', 'veins', 'gold'].includes(st.show))
      if (needs) expect(s.mark, s.id).toBe('illustrative')
    }
  })

  it('follows the writing rules (ASD-STE100, adapted)', () => {
    for (const s of steps) {
      const line = lineOf(s, ctx)
      const more = moreOf(s, ctx)
      for (const text of [s.title, line, more]) {
        expect(forbiddenWordsIn(text), s.id).toEqual([])
        expect(text.includes('被'), s.id).toBe(false)
      }
      const ls = sentences(line)
      expect(ls.length, s.id).toBeLessThanOrEqual(LINE_SENTENCES_MAX)
      for (const x of ls) expect(Array.from(x).length, `${s.id}: ${x}`).toBeLessThanOrEqual(LINE_SENTENCE_MAX)
      const ms = sentences(more)
      expect(ms.length, s.id).toBeLessThanOrEqual(MORE_SENTENCES_MAX)
      for (const x of ms) expect(Array.from(x).length, `${s.id}: ${x}`).toBeLessThanOrEqual(MORE_SENTENCE_MAX)
      if (s.until) expect(ACTION_VERBS.some((v) => stripMarkup(line).startsWith(v)), s.id).toBe(true)
    }
  })

  it('level titles follow the glossary and avoid 被', () => {
    for (const l of LEVELS) {
      expect(forbiddenWordsIn(l.title), l.id).toEqual([])
      expect(l.title.includes('被'), l.id).toBe(false)
    }
  })

  it('keeps callout titles ≤ 8 characters and big-number labels ≤ 12', () => {
    for (const s of steps) {
      for (const c of s.callouts ?? []) expect(Array.from(resolve(c.title)!).length, `${s.id}: ${resolve(c.title)}`).toBeLessThanOrEqual(8)
      const bn = bigOf(s)
      if (bn) expect(Array.from(bn.label).length, `${s.id}: ${bn.label}`).toBeLessThanOrEqual(12)
    }
  })

  it('backs every big number with verified data, or marks it', () => {
    // 每個大數字用到的資料來源；新增大數字時必須補上，或在 bigNumber 上加標示
    const SOURCES: Record<string, [string, VerifiedKey][]> = {
      'f-4': [['ALLIANZ_INCOME_GROWTH', 'holdings']],
      'f-5': [['JH_BALANCED', 'fees.expenseRatio']],
      'f-6': [['SCHRODER_GLOBAL_INCOME_BOND', 'fees.expenseRatio'], ['SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'fees.expenseRatio'], ['SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'fees.cdsc'], ['SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'fees.distributionFee']],
      'e-3': [['0050', 'holdings']],
      'e-5': [['0050', 'fees.expenseRatio'], ['JH_BALANCED', 'fees.expenseRatio']],
      'c-2': [['0050', 'holdings']],
      'c-3': [['QQQ', 'holdings'], ['SPY', 'holdings']],
      'u-2': [['0050', 'holdings']],
    }
    for (const s of steps) {
      const bn = bigOf(s)
      if (!bn) continue
      if (bn.mark) continue
      const src = SOURCES[s.id]
      expect(src, `${s.id}: list its data source or mark it`).toBeDefined()
      for (const [id, key] of src!) expect(isVerified(universe.get(id)!, key), `${s.id}: ${id} ${key}`).toBe(true)
    }
  })

  it('marks ？ on every step whose numbers come from unverified holdings (user test: f-2 had no mark)', () => {
    // 獨立的記錄器（不用 marks.ts 的 holdingsSources，免得自己驗自己）：記下每一步的文字用了哪些產品的持股
    const used = (s: Step): Set<string> => {
      const seen = new Set<string>()
      const rec = new Proxy(ctx, {
        get: (t, k: keyof typeof ctx) => {
          const f = t[k] as (...a: never[]) => unknown
          return (...a: never[]) => {
            if (k === 'weightPct' || k === 'assetClassPct' || k === 'sectorPct' || k === 'shock') seen.add(String(a[0]))
            if (k === 'overlapShared') { seen.add(String(a[0])); seen.add(String(a[1])) }
            return f(...a)
          }
        },
      })
      const values = { ...DEFAULT_VALUES, ...s.scene.values }
      const texts = [s.line, s.more, s.fallbackLine, s.fallbackMore, ...(s.callouts ?? []).flatMap((c) => [c.title, c.sub])]
      for (const t of texts) if (typeof t === 'function') t(rec)
      s.bigNumber?.(rec, values)
      return seen
    }
    // 目前快照的持股都已查證；為了讓這道防線繼續有效，把基金（f-2、f-4）和 0050（e-3、c-2、u-2）的持股旗標清空再檢查一次。
    // 不用手動宣告：stepMarks 從步驟文字實際用到的資料自己推出來（r5 之前只有 f-2、f-4 宣告了 holdingsFrom）
    const stale = unverify(['JH_BALANCED', 'ALLIANZ_INCOME_GROWTH', '0050'])
    let checked = 0
    for (const s of steps) {
      for (const id of used(s)) {
        const a = stale.get(id)
        if (a && !isVerified(a, 'holdings')) {
          checked++
          expect(stepMarks(s, stale), `${s.id}: shows numbers from ${id} holdings, which are unverified`).toContain('unverified')
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
    for (const id of ['f-2', 'f-4', 'e-3', 'c-2', 'u-2']) expect(stepMarks(byId(id), stale), id).toContain('unverified')
    // 沒用到持股的步驟不會多出 ？
    expect(stepMarks(byId('e-1'), stale)).not.toContain('unverified')
    // 真實快照：持股都已查證 → 沒有 ？
    for (const id of ['f-2', 'f-4', 'e-3', 'c-2', 'u-2']) expect(stepMarks(byId(id), universe), id).not.toContain('unverified')
  })

  it('exposes the assumed front-load fee only on steps marked ✎', () => {
    for (const s of steps) if (s.controls?.includes('frontLoad')) expect(s.mark, s.id).toBe('assumption')
  })

  it('applies the same writing rules to the text-only versions and callouts', () => {
    for (const s of steps) {
      const fl = resolve(s.fallbackLine)
      if (fl !== undefined) {
        expect(visibleLength(fl), s.id).toBeLessThanOrEqual(20)
        const ls = sentences(fl)
        expect(ls.length, s.id).toBeLessThanOrEqual(LINE_SENTENCES_MAX)
        for (const x of ls) expect(Array.from(x).length, `${s.id}: ${x}`).toBeLessThanOrEqual(LINE_SENTENCE_MAX)
      }
      const fm = resolve(s.fallbackMore)
      if (fm !== undefined) {
        const ms = sentences(fm)
        expect(ms.length, s.id).toBeLessThanOrEqual(MORE_SENTENCES_MAX)
        for (const x of ms) expect(Array.from(x).length, `${s.id}: ${x}`).toBeLessThanOrEqual(MORE_SENTENCE_MAX)
      }
      const extra = [fl, fm, ...(s.callouts ?? []).flatMap((c) => [resolve(c.title), resolve(c.sub)])]
      const bn = bigOf(s)
      if (bn) extra.push(bn.label)
      for (const t of extra) {
        if (t === undefined) continue
        expect(forbiddenWordsIn(t), s.id).toEqual([])
        expect(t.includes('被'), s.id).toBe(false)
      }
    }
  })

  it('resolves every colour key in lines and big numbers', () => {
    for (const s of steps) {
      const keys = parseEmphasis(lineOf(s, ctx)).flatMap((seg) => (seg.key ? [seg.key] : []))
      const bk = bigOf(s)?.colorKey
      if (bk) keys.push(bk)
      for (const k of keys) expect(colorForKey(universe, k), `${s.id}: ${k}`).toBeDefined()
    }
  })

  it('anchors callouts and focus on real buildings and holdings in the step product', () => {
    for (const s of steps) {
      const product = s.scene.product ? universe.get(s.scene.product) : undefined
      const inProduct = (id: string) => !!product?.holdings?.some((h) => h.id === id)
      for (const id of s.focus?.holdings ?? []) expect(inProduct(id), `${s.id}: ${id}`).toBe(true)
      for (const c of s.callouts ?? []) {
        if (c.anchor.kind === 'holding') expect(inProduct(c.anchor.holdingId), `${s.id}: ${c.anchor.holdingId}`).toBe(true)
        else expect(universe.has(c.anchor.id), `${s.id}: ${c.anchor.id}`).toBe(true)
      }
    }
  })

  it('gives every big number a value and a label, with fraction within 0–1', () => {
    for (const s of steps) {
      const bn = bigOf(s)
      if (!bn) continue
      expect(bn.value.length, s.id).toBeGreaterThan(0)
      expect(bn.label.length, s.id).toBeGreaterThan(0)
      if (bn.fraction !== undefined) {
        expect(bn.fraction, s.id).toBeGreaterThanOrEqual(0)
        expect(bn.fraction, s.id).toBeLessThanOrEqual(1)
      }
    }
  })

  it('labels illustrative stages as 示意 in their more text', () => {
    const illustrative = new Set(['held', 'exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker', ...PLAN7_STAGES, ...PLAN8_STAGES])
    const undergroundIllustrative = new Set(['dig', 'veins', 'gold'])
    for (const s of steps) {
      const st = s.scene.stage
      if (st?.kind === 'underground' && undergroundIllustrative.has(st.show)) expect(moreOf(s, ctx), s.id).toContain('示意')
      const kind = st?.kind
      if (kind && illustrative.has(kind) && !(kind === 'held' && s.scene.stage?.kind === 'held' && s.scene.stage.items.every((i) => i.motion === 'still'))) {
        expect(moreOf(s, ctx), s.id).toContain('示意')
      }
    }
  })

  it('computes numbers from data instead of hard-coding them', () => {
    const e3 = byId('e-3')
    expect(lineOf(e3, ctx)).toContain('**56%**') // pct0(56.31)
    expect(bigOf(e3)).toEqual({ value: '56%', label: '台積電在 0050', fraction: 0.5631, colorKey: '2330' })
    const c2 = byId('c-2')
    expect(lineOf(c2, ctx)).toContain('跌約 **16.9%**') // |−0.3 × 56.31%| = 16.893%，句子已說「跌」所以用絕對值
    expect(lineOf(c2, ctx)).not.toContain('−')
    expect(moreOf(c2, ctx)).toContain('約 −16.9%')
    expect(bigOf(c2)!.value).toBe('跌 16.9%') // r3：大數字的負號太細，看成正的 → 用字說「跌」
    expect(bigOf(byId('f-5'))!.value).toBe('18,800 元') // JH_BALANCED expenseRatio 0.0188 × 1,000,000（r6：穩定的元，不是會跳的累計）
    expect(bigOf(byId('f-5'))!.note).toContain('1.88%')
    // e-5：100 萬放一年要扣的錢＝內扣費用 × 1,000,000（r5：只有 0.18% 沒感覺）
    expect(bigOf(byId('e-5'))!.value).toBe('1,400 元') // 0050 expenseRatio 0.0014 × 1,000,000 = 1,400
    expect(lineOf(byId('e-5'), ctx)).toContain('18,800 元') // JH_BALANCED expenseRatio 0.0188 × 1,000,000 = 18,800
    expect(bigOf(byId('c-3'))!.value).toBe(`至少 ${(overlap(universe, 'QQQ', 'SPY').total * 100).toFixed(1)}%`)
    // s-5 跟著即時時間軸，但只到配發那一刻（之後的填息不算）：配發前 100 ＋ 0，配發那一刻 95 ＋ 5，合計永遠 100
    expect(bigOf(byId('s-5'))).toEqual({ value: '100', label: '方塊 100＋金幣 0', mark: 'illustrative' })
    expect(bigOf(byId('s-5'), { phase: EXDIV_AFTER_PHASE })).toEqual({ value: '100', label: '方塊 95＋金幣 5', mark: 'illustrative' }) // EXDIV 100 − 5 + 5
    for (let i = 0; i <= 20; i++) {
      const phase = i * 0.05
      const bn = bigOf(byId('s-5'), { phase })!
      expect(bn.value, `phase ${phase}`).toBe('100')
      const [block, coins] = (bn.label.match(/\d+/g) ?? []).map(Number)
      expect(block! + coins!, `phase ${phase}: ${bn.label}`).toBe(100)
      expect(bn.label, `never 100 ＋ 5 (phase ${phase})`).not.toBe('方塊 100＋金幣 5')
    }
    expect(lineOf(byId('s-5'), ctx)).toContain('**金幣|coin**') // 金幣用金幣色（3b1b 顏色連結）
    expect(lineOf(byId('s-5'), ctx)).toContain('**不變**')
  })

  it('says 配息來自本金 only on the illustrative principal-trap step', () => {
    for (const s of steps) {
      if (moreOf(s, ctx).includes('來自本金') || lineOf(s, ctx).includes('本金|loss')) {
        expect(s.scene.stage?.kind, s.id).toBe('principalTrap')
        expect(s.mark, s.id).toBe('illustrative')
      }
    }
    expect(moreOf(byId('f-9'), ctx)).toContain('示意基金')
  })

  it('gives every step its own scene object so the camera sequence always bumps', () => {
    expect(new Set(steps.map((s) => s.scene)).size).toBe(steps.length)
  })

  it('every 至少 big number explains in plain words why it is only a lower bound (r2)', () => {
    let n = 0
    for (const s of steps) {
      const bn = bigOf(s)
      if (!bn?.value.startsWith('至少')) continue
      n++
      expect(bn.note, s.id).toBeDefined()
      expect(bn.note!, s.id).toContain('實際更多')
      expect(Array.from(bn.note!).length, s.id).toBeLessThanOrEqual(14)
      expect(jargonIn(bn.note!), s.id).toEqual([])
    }
    expect(n).toBe(2) // c-3、u-2
  })

  it('u-2 says the semiconductor share is a lower bound', () => {
    expect(moreOf(byId('u-2'), ctx)).toContain('至少約')
    expect(lineOf(byId('u-2'), ctx)).toContain('至少')
    expect(bigOf(byId('u-2'))!.value.startsWith('至少')).toBe(true)
  })

  it('derives the u-2 semiconductor percentage from sectorPct', () => {
    const u2 = byId('u-2')
    expect(lineOf(u2, ctx)).toContain(`${ctx.sectorPct('0050', 'semiconductor').toFixed(0)}%`)
    expect(moreOf(u2, ctx)).toContain(`${ctx.sectorPct('0050', 'semiconductor').toFixed(0)}%`)
  })

  it('data facts the lesson text relies on', () => {
    const w = (p: string, h: string) => universe.get(p)?.holdings?.find((x) => x.id === h)?.weightPct
    expect(w('0050', '2330') ?? 0).toBeGreaterThan(50)
    expect(w('SPY', '2330')).toBeUndefined()
    for (const id of ['NVDA', 'MSFT', 'US_TREASURY']) expect(w('JH_BALANCED', id), id).toBeDefined()
    const ids = overlap(universe, 'QQQ', 'SPY').rows.map((r) => r.id)
    for (const id of ['NVDA', 'AAPL', 'MSFT']) expect(ids).toContain(id)
    const er = (id: string) => universe.get(id)!.fees!.expenseRatio!
    const funds = [...universe.values()].filter((a) => a.type === 'fund' && a.fees?.expenseRatio !== undefined)
    expect(funds.length).toBeGreaterThan(0)
    for (const f of funds) {
      expect(er('QQQ'), f.id).toBeLessThan(f.fees!.expenseRatio!)
      expect(er('SPY'), f.id).toBeLessThan(f.fees!.expenseRatio!)
    }
    expect(moreOf(byId('f-4'), ctx)).toContain('32%') // 可轉債 pct0(31.98)，只在多說一點
    expect(moreOf(byId('e-3'), ctx)).toContain('7%') // 2454: pct0(6.71)
  })
})

describe('control ranges and the dividend steps (user test r1)', () => {
  const ranged = (s: Step) => (s.controls ?? []).map((c) => [c, controlRange(s, c)] as const)

  it('keeps every entry value and gate inside the step control range, and gates need a drag', () => {
    for (const s of steps) {
      for (const [c, [lo, hi]] of ranged(s)) {
        expect(lo, `${s.id}:${c}`).toBeLessThan(hi)
        if (c === 'slice' || c === 'explode') {
          const start = (c === 'slice' ? s.scene.slice : s.scene.explode) ?? 0
          expect(start, `${s.id}:${c}`).toBeGreaterThanOrEqual(lo)
          expect(start, `${s.id}:${c}`).toBeLessThanOrEqual(hi)
        } else {
          const start = { ...DEFAULT_VALUES, ...s.scene.values }[c]
          expect(start, `${s.id}:${c}`).toBeGreaterThanOrEqual(lo)
          expect(start, `${s.id}:${c}`).toBeLessThanOrEqual(hi)
        }
      }
      if (s.until) {
        const [lo, hi] = controlRange(s, s.until.control)
        expect(s.until.min, s.id).toBeGreaterThan(lo)
        expect(s.until.min, s.id).toBeLessThanOrEqual(hi)
      }
    }
  })

  it('s-5 is the one drag step: the timeline stops at the payout moment and the card and the 3D tags always agree', () => {
    const s5 = byId('s-5')
    expect(s5.title).toBe('發金幣那一刻')
    expect(controlRange(s5, 'phase')).toEqual([0, EXDIV_AFTER_PHASE])
    expect(s5.scene.values?.phase).toBe(0)
    expect(s5.until).toEqual({ control: 'phase', min: EXDIV_AFTER_PHASE }) // 要拉到發金幣那一刻
    for (let i = 0; i <= 10; i++) {
      const phase = (i / 10) * EXDIV_AFTER_PHASE
      const e = exDivTimeline(phase, 'fill') // 3D 舞台用同一條時間軸
      const bn = bigOf(s5, { phase })!
      expect(bn.label, `phase ${phase}`).toBe(`方塊 ${e.blockValue.toFixed(0)}＋金幣 ${e.cash.toFixed(0)}`)
    }
  })

  it('has only two coin steps in a row (s-5, s-6), then the bond chapter', () => {
    const ids = steps.map((s) => s.id)
    const coin = steps.filter((s) => s.scene.stage?.kind === 'exdiv').map((s) => s.id)
    expect(coin).toEqual(['s-5', 's-6'])
    expect(ids.slice(ids.indexOf('s-5'), ids.indexOf('s-5') + 3)).toEqual(['s-5', 's-6', 'b-1'])
  })

  it('s-6 shows the result without another drag: set-up in the line, one number on the card (r3)', () => {
    const s6 = byId('s-6')
    expect(s6.title).toBe('方塊沒長回來')
    expect(s6.controls).toBeUndefined()
    expect(s6.until).toBeUndefined()
    const line = stripMarkup(lineOf(s6, ctx))
    expect(line).toContain('有時會長回來') // 先說「會長回來」是可能的（不說「通常」：那不是事實保證）
    expect(line).toContain('這次沒有') // 結果
    // 95 ＋ 5 之後貼息到 92：合起來 97，比 100 少 3。卡片只放一個數字
    const bn = bigOf(s6)!
    expect(bn).toMatchObject({ value: '少 3', colorKey: 'loss', mark: 'illustrative' })
    expect(bn.label.match(/\d/g)).toBeNull() // 標籤裡沒有別的數字
    expect(bn.fraction).toBeUndefined()
    // 唯一的算式放在多說一點
    expect(moreOf(s6, ctx)).toContain('方塊 92＋金幣 5＝97')
  })

  it('keeps 除息／填息／貼息 out of titles and lines (多說一點 only)', () => {
    for (const s of steps) for (const w of ['除息', '填息', '貼息']) {
      expect(s.title.includes(w), `${s.id}: ${w}`).toBe(false)
      expect(lineOf(s, ctx).includes(w), `${s.id}: ${w}`).toBe(false)
    }
  })

  it('the laser steps look at the cut from an angle, not straight along the cut axis (r2: only a pink frame)', () => {
    // 鏡頭若正對切割軸，切掉的是靠近鏡頭那一面：剩下的方塊看起來一模一樣，只多一個粉紅框
    const AXIS = { x: [1, 0, 0], z: [0, 0, 1], y: [0, 1, 0] } as const
    for (const s of steps) {
      if (!(s.controls?.includes('slice') || (s.scene.slice ?? 0) > 0)) continue
      const p = CAMERA_PRESETS[s.scene.camera]
      const d = p.position.map((v, i) => v - p.target[i]!)
      const len = Math.hypot(...d)
      const axis = AXIS[(s.scene.sliceAxis ?? 'x') as keyof typeof AXIS]
      const along = Math.abs(d.reduce((sum, v, i) => sum + v * axis[i]!, 0)) / len
      expect(along, s.id).toBeLessThanOrEqual(0.85)
      expect(along, s.id).toBeGreaterThanOrEqual(0.3) // 也要看得到切面
    }
  })

  it('e-2 caps the laser so part of 0050 always remains', () => {
    const [, hi] = controlRange(byId('e-2'), 'slice')
    expect(hi).toBeLessThanOrEqual(0.6)
  })
})


describe('jargon diet (user test r1)', () => {
  const NICK = T.nick as Record<string, string>
  const labelsOf = (s: Step): string[] => {
    const out = [s.title, stripMarkup(lineOf(s, ctx))]
    const bn = bigOf(s)
    if (bn) out.push(bn.label)
    for (const c of s.callouts ?? []) out.push(resolve(c.title)!)
    return out
  }

  it('keeps jargon out of titles, lines, big-number labels and callout titles', () => {
    for (const s of steps) for (const t of labelsOf(s)) expect(jargonIn(t), `${s.id}: ${t}`).toEqual([])
  })

  it('introduces 0050, QQQ and SPY by nickname the first time a line names them', () => {
    for (const code of Object.keys(NICK)) {
      const first = steps.find((s) => stripMarkup(lineOf(s, ctx)).includes(code))
      if (!first) continue // 一句話從沒提到（例如 SPY 只出現在 3D 標籤，標籤一律用暱稱）
      expect(stripMarkup(lineOf(first!, ctx)), `${first!.id}: ${code}`).toContain(NICK[code])
    }
  })

  it('renames s-4 and drops the frontLoad slider from f-6', () => {
    expect(byId('s-4').title).toBe('有的晃很兇')
    expect(stripMarkup(lineOf(byId('s-4'), ctx))).toBe('晃越兇，跌起來通常越深') // mid-r1：接到最大跌幅
    expect(byId('f-6').controls).toEqual(['years'])
    expect(byId('f-6').mark).toBe('assumption') // 預設的前收手續費仍是假設值
  })

  it('b-2 ranks the three bonds on the stage; b-3 stresses them with the tornado event', () => {
    expect(byId('b-2').scene.stage).toEqual({ kind: 'bonds', ranks: true })
    expect(byId('b-2').scene.event).toBeUndefined()
    expect(byId('b-3').scene.stage).toEqual({ kind: 'bonds' })
    expect(byId('b-3').scene.event).toEqual({ kind: 'tornado' })
  })

  it('c-1 gathers the lightning cloud, c-2 strikes', () => {
    expect(byId('c-1').scene.stage).toEqual({ kind: 'shock' })
    expect(byId('c-1').scene.event).toEqual({ kind: 'lightning', phase: 'gather' })
    expect(byId('c-2').scene.stage).toEqual({ kind: 'shock' })
    expect(byId('c-2').scene.event).toEqual({ kind: 'lightning', phase: 'strike' })
  })

  it('names the two biggest layers on f-2 (after the explode) and e-1', () => {
    const top2 = (productId: string) =>
      [...universe.get(productId)!.holdings!].sort((a, b) => b.weightPct - a.weightPct).slice(0, 2).map((h) => h.id)
    for (const id of ['f-2', 'e-1']) {
      const s = byId(id)
      const anchors = (s.callouts ?? []).map((c) => (c.anchor.kind === 'holding' ? c.anchor.holdingId : ''))
      expect(anchors.sort(), id).toEqual(top2(s.scene.product!).sort())
    }
    for (const c of byId('f-2').callouts!) expect(c.when, 'f-2 shows names once the tower is apart').toEqual(byId('f-2').until)
  })

  it('f-2 names every layer through its two labels: 股票方塊 (incl. the big companies below) and 借據 (r3: 30% + 38% = 68%, the rest?)', () => {
    const f2 = byId('f-2')
    expect((f2.callouts ?? []).map((c) => resolve(c.title))).toEqual(['股票方塊', '借據'])
    const subs = (f2.callouts ?? []).map((c) => resolve(c.sub)!)
    expect(subs[0]).toContain(`約 ${pct0(ctx.assetClassPct('JH_BALANCED', 'stock'))}%`) // 64.08 → 64
    expect(subs[0]).toContain('輝達')
    expect(subs[1]).toBe(`約 ${pct0(ctx.assetClassPct('JH_BALANCED', 'bond'))}%・其他約 ${pct0(100 - ctx.assetClassPct('JH_BALANCED', 'stock') - ctx.assetClassPct('JH_BALANCED', 'bond'))}%`) // 33.86 → 34；mid-r2：剩下的也寫出來
    expect(subs[1]).toBe('約 34%・其他約 2%') // 100 − 64.08 − 33.86 = 2.06
    for (const t of [...subs, stripMarkup(lineOf(f2, ctx))]) expect(t).not.toContain('美股')
  })

  it('f-4 is purely visual: another 怪手 picked a different tower (股票 vs 借據), no jargon on screen', () => {
    const f4 = byId('f-4')
    const onScreen = [f4.title, stripMarkup(lineOf(f4, ctx)), ...(f4.callouts ?? []).flatMap((c) => [resolve(c.title)!, resolve(c.sub) ?? ''])]
    for (const t of onScreen) expect(t, t).not.toMatch(/可轉債|高收益債|多重資產|安聯|平衡|檔|同名/)
    expect(stripMarkup(lineOf(f4, ctx))).toContain('股票＋借據') // 事實：股票＋借據（不說它是平衡型）
    expect(stripMarkup(lineOf(f4, ctx))).toContain('比例差很多')
    // 另一位經理人：怪手換顏色、標註寫「另一位經理人」（r3：怪手一模一樣，不信是另一台）
    expect(f4.scene.stage).toEqual({ kind: 'excavator', meter: false, other: true })
    expect(T.excavatorOther).toContain('另一位經理人')
    expect(f4.bigNumber).toBeUndefined()
    // 亮的＝借據（所有債券層），暗的＝股票
    const bonds = universe.get('ALLIANZ_INCOME_GROWTH')!.holdings!.filter((h) => ['convertible', 'highYieldBond', 'govBond', 'corpBond', 'bondMixed'].includes(universe.get(h.id)!.type)).map((h) => h.id)
    expect([...(f4.focus?.holdings ?? [])].sort()).toEqual(bonds.sort())
    expect((f4.callouts ?? []).map((c) => resolve(c.title))).toEqual(['股票', '借據'])
    // 副標的百分比從資料加總：股票約 32%、借據約 62%
    expect((f4.callouts ?? []).map((c) => resolve(c.sub))).toEqual([
      `約 ${pct0(ctx.assetClassPct('ALLIANZ_INCOME_GROWTH', 'stock'))}%`,
      `約 ${pct0(ctx.assetClassPct('ALLIANZ_INCOME_GROWTH', 'bond'))}%・其他約 ${pct0(100 - ctx.assetClassPct('ALLIANZ_INCOME_GROWTH', 'stock') - ctx.assetClassPct('ALLIANZ_INCOME_GROWTH', 'bond'))}%`,
    ])
    expect((f4.callouts ?? []).map((c) => resolve(c.sub))).toEqual(['約 32%', '約 62%・其他約 6%'])
    // 細節留在多說一點
    expect(moreOf(f4, ctx)).toContain('可轉債')
    expect(moreOf(f4, ctx)).toContain('高收益債')
  })

  it('f-6 shows only the two fund towers: 0050 is not named before the ETF chapter', () => {
    expect(byId('f-6').scene.stage).toMatchObject({ kind: 'feeRace', etf: false })
    const firstEtf = steps.findIndex((s) => s.id === 'e-1')
    for (const s of steps.slice(0, firstEtf)) {
      const texts = [s.title, lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore), ...(s.callouts ?? []).flatMap((c) => [resolve(c.title), resolve(c.sub)])]
      for (const t of texts) if (t !== undefined) expect(t.includes('0050'), `${s.id}: ${t}`).toBe(false)
    }
  })

  it('f-6 carries ✎ assumption and ？ unverified (from the data), once each', () => {
    // 內扣費用已查證（2026-10）→ 只剩 ✎；旗標清空時 ？ 仍會出現
    expect(stepMarks(byId('f-6'), universe)).toEqual(['assumption'])
    expect(stepMarks(byId('f-6'), unverify(['SCHRODER_GLOBAL_INCOME_BOND', 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD']))).toEqual(['assumption', 'unverified'])
    expect(stepMarks(byId('s-5'), universe)).toEqual(['illustrative'])
    expect(stepMarks(byId('p-1'), universe)).toEqual([])
  })

  it('f-6 tells the whole fee-door story in one step (r3: f-6/f-7 looked the same and both asked for the same drag)', () => {
    const f6 = byId('f-6')
    expect(steps.some((s) => s.id === 'f-7')).toBe(false)
    expect(LEVELS.find((l) => l.id === 'fund')!.steps.map((s) => s.id)).toEqual(['f-1', 'f-2', 'f-3', 'f-4', 'f-5', 'f-6', 'f-8', 'f-9'])
    expect(f6.title).toBe('進門費、出門費')
    expect(f6.controls).toEqual(['years'])
    expect(f6.scene.stage).toEqual({ kind: 'feeRace', etf: false })
    expect(f6.scene.values?.years).toBe(0)
    expect(f6.until).toEqual({ control: 'years', min: 3 }) // 出門費滿 3 年歸零
    // mid-r2：一個問題——現在賣，兩種收費總共扣多少
    expect(stripMarkup(lineOf(f6, ctx))).toBe('拖持有年數。看兩種收費總共扣多少')
    expect(stripMarkup(resolve(f6.fallbackLine)!)).not.toMatch(/^拖/) // 文字版沒有拉桿
    // 大數字＝前收、後收各總共扣了多少（100 萬為底、單位萬；＝ 100 − 塔的價值）
    expect(bigOf(f6, { years: 0 })).toMatchObject({ value: '1.5 vs 3 萬', label: '現在賣：前收 vs 後收', colorKey: 'loss' }) // 進門 1.5%；出門 3%
    expect(bigOf(f6, { years: 10 })!.value).toBe('14.3 vs 15.6 萬') // 100 − 85.72；100 − 84.44
    for (let y = 0; y <= 10; y += 0.5) {
      const [front, back] = ctx.fundFeeRows(y, DEFAULT_VALUES.frontLoad)
      expect(bigOf(f6, { years: y })!.value, `year ${y}`).toBe(`${Number(front!.lost.toFixed(1))} vs ${wan(back!.lost)}`)
    }
    // 為什麼後收一直多一點：前 3 年每年多扣 1% 分銷費（資料算出來），而且要看各檔費用
    expect(bigOf(f6)!.note).toBe('只算費用，沒算漲跌。後收前 3 年每年多扣 1%（看各檔費用）')
    expect(moreOf(f6, ctx)).toContain('誰比較省要看各檔的費用')
    // 多說一點的數字從資料算：出門費 cdsc[0] = 3%、滿 3 年歸零；前收手續費是預設的假設值 1.5%
    expect(moreOf(f6, ctx)).toContain('出門費 3%')
    expect(moreOf(f6, ctx)).toContain('滿 3 年不收')
    expect(moreOf(f6, ctx)).toContain('假設 1.5%')
  })

  it('the fund chapter talks in 萬 on a 100-萬 base, like the fee meter (r3: 100 萬 then 100 元)', () => {
    expect(T.feeMeter.base).toContain('100 萬')
    expect(T.towers.base).toBe(T.feeMeter.base)
    expect(T.towers.baseDemo).toContain('100 萬')
    expect(T.towers.value(98.5)).toBe('98.5 萬')
    expect(T.towers.coins(107.46)).toBe('領到的金幣 107.5 萬')
    expect(T.readout.remaining(88.24)).toBe('剩 88.2 萬')
    const fund = LEVELS.find((l) => l.id === 'fund')!
    // f-5 的大數字刻意用元（r6：「100 萬一年約扣 18,800 元」，和 e-5 同一檔基金同一算法）；其餘仍用萬
    for (const s of fund.steps.filter((x) => x.id !== 'f-5')) {
      const texts = [lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore), bigOf(s)?.value, bigOf(s)?.label]
      for (const t of texts) if (t !== undefined) expect(t, s.id).not.toMatch(/\d\s*元/)
    }
  })

  it('c-3 says plainly that both boxes hold the same companies', () => {
    expect(stripMarkup(lineOf(byId('c-3'), ctx))).toContain('一樣的公司')
  })

  it('u-6 ends with a four-line recap and calls the sandbox 自由玩', () => {
    const u6 = byId('u-6')
    expect(u6.recap).toHaveLength(4)
    const recaps = steps.flatMap((s) => s.recap ?? [])
    expect(recaps.length).toBeGreaterThan(u6.recap!.length) // m-0、m-fin 也照同樣規則
    for (const r of recaps) {
      expect(r.icon.length).toBeGreaterThan(0)
      expect(Array.from(r.text).length, r.text).toBeLessThanOrEqual(18)
      expect(forbiddenWordsIn(r.text)).toEqual([])
      expect(r.text.includes('被'), r.text).toBe(false)
      expect(jargonIn(r.text), r.text).toEqual([])
    }
    expect(T.finish).toBe('自由玩')
    for (const s of steps) for (const t of [lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore)]) {
      if (t !== undefined) expect(t.includes('沙盒'), s.id).toBe(false)
    }
  })
})

describe('初階 copy stands on its own (no reference to a step that is only in 中階)', () => {
  it('b-3 says what 高收益債 is (b-2 that explained the three kinds is dropped)', () => {
    expect(moreOf(byId('b-3'), ctx)).toContain('高收益債＝')
  })
  it('f-9 says what 配息 is (s-5 and f-8 are dropped) and its line names 配息', () => {
    expect(moreOf(byId('f-9'), ctx)).toContain('配息＝')
    expect(lineOf(byId('f-9'), ctx)).toContain('配息')
  })
  it('u-6 does not claim the whole course was finished', () => {
    expect(moreOf(byId('u-6'), ctx)).not.toContain('全部')
    expect(resolve(byId('u-6').fallbackMore)).not.toContain('全部')
  })
})

describe('初階 user test r5', () => {
  it('f-9 makes the trap visible: the big number is the part of the payout that was your own principal', () => {
    const f9 = byId('f-9')
    const at = (periods: number) => bigOf(f9, { periods })!
    // TRAP_DEMO：產出 3%、配 6%，20 年後塔剩 100 × 0.97^20 = 54.38；配出超過產出的部分＝100 − 54.38 = 45.62
    const st = principalTrap(20)
    expect(st.fromPrincipal).toBeCloseTo(100 - st.value, 9)
    expect(at(20).value).toBe(wan(st.fromPrincipal))
    expect(at(20).value).toBe('45.6 萬')
    expect(at(20).colorKey).toBe('loss')
    expect(at(20).mark).toBe('illustrative')
    expect(at(10).value).toBe(wan(principalTrap(10).fromPrincipal)) // 跟著拉桿
    expect(at(20).label).toContain('本金')
    // 一句話：拖拉桿的動作詞開頭，意思是「領的錢有一部分是你的本金」
    expect(stripMarkup(lineOf(f9, ctx))).toContain('本金')
    // 不說成「賠錢」：示意基金每年真的產出 3%，總數本來就比 100 多（領到的錢裡，一部分是賺的、一部分是本金）
    for (const t of [lineOf(f9, ctx), moreOf(f9, ctx)]) for (const w of ['賠', '虧']) expect(t, w).not.toContain(w)
  })

  it('f-9 hides the big number until the slider moves (r6: 「0 萬，領的錢裡是你的本金」 is unreadable)', () => {
    expect(bigOf(byId('f-9'), { periods: 0 })).toBeUndefined()
    expect(bigOf(byId('f-9'), { periods: 20 })).toBeDefined()
  })

  it('f-9: the coin pile label says how much of it came from principal (3D)', () => {
    const st = principalTrap(20)
    const t = trapTowerSpec(st)
    expect(t.coins).toBe(st.cashReceived)
    expect(t.coinsSub).toBe(`其中 ${wan(st.fromPrincipal)}是本金`)
    expect(towerTexts(t)).toContain(t.coinsSub)
    expect(trapTowerSpec(principalTrap(0)).coinsSub).toBeUndefined() // 還沒領，不寫
  })

  it('e-5 compares 0050 with the fund from f-5 in yuan per 100 萬 per year, and keeps the caveat', () => {
    const e5 = byId('e-5')
    const yuan = (id: string) => `${Math.round(ctx.expenseRatio(id)! * 1_000_000).toLocaleString('zh-TW')} 元`
    expect(bigOf(e5)!.value).toBe(yuan('0050'))
    expect(lineOf(e5, ctx)).toContain(yuan(byId('f-5').scene.product!))
    expect(stripMarkup(lineOf(e5, ctx))).toContain('100 萬')
    expect(bigOf(e5)!.note).toContain('不代表比較好')
    expect(e5.scene.product).toBe('0050')
    for (const t of [e5.title, stripMarkup(lineOf(e5, ctx)), bigOf(e5)!.label]) for (const code of ['QQQ', 'SPY']) expect(t).not.toContain(code)
    expect(moreOf(e5, ctx)).toContain('QQQ')
  })

  it('b-1 says 固定給 instead of 滴, everywhere a learner reads it', () => {
    expect(stripMarkup(lineOf(byId('b-1'), ctx))).toContain('固定給')
    for (const s of steps) for (const t of [s.title, lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore), ...(s.recap ?? []).map((r) => r.text)]) {
      if (t !== undefined) expect(t.includes('滴'), `${s.id}: ${t}`).toBe(false)
    }
  })
})

describe('Plan 7 中階: 最大跌幅 (s-dd)', () => {
  const s = () => byId('s-dd')
  it('drag the timeline to the trough: the quake turns on there, the gate is the same point, and the pit depth is the max drawdown', () => {
    const d = maxDrawdown(DD_DEMO.path)
    expect(s().until).toEqual({ control: 'tick', min: d.troughIndex })
    expect(s().scene.eventWhen).toEqual(s().until)
    expect(s().scene.event).toEqual({ kind: 'quake', depth: d.pct, at: [ddBarX(d.troughIndex), DD_LAYOUT.pitZ], width: DD_LAYOUT.pitWidth })
    expect(controlRange(s(), 'tick')).toEqual([0, DD_DEMO.path.length - 1])
    expect(s().scene.values?.tick).toBe(0)
    expect(stripMarkup(lineOf(s(), ctx)).startsWith('拖')).toBe(true)
  })
  it('the big number is the biggest drop so far (hidden before any drop) and stays at 40% after the price grows back', () => {
    expect(bigOf(s(), { tick: 0 })).toBeUndefined()
    expect(bigOf(s(), { tick: 4 })).toMatchObject({ value: '20%', label: '最多曾經少掉', colorKey: 'loss', mark: 'illustrative' }) // (140 − 112) ÷ 140
    expect(bigOf(s(), { tick: 5 })!.value).toBe('40%') // (140 − 84) ÷ 140
    expect(bigOf(s(), { tick: 5 })!.fraction).toBeCloseTo(0.4, 12)
    expect(bigOf(s(), { tick: 7 })!.value).toBe('40%')
    expect(moreOf(s(), ctx)).toContain('從 140 跌到 84，少掉 40%')
    expect(resolve(s().fallbackLine)).toContain('40%')
  })
  it('the fallback (text) version shows the readout at the gate', () => {
    const rows = stageReadout({ kind: 'drawdown' }, { ...DEFAULT_VALUES, tick: 5, slice: 0, explode: 0 }, universe, null)
    expect(rows.map((r) => r.value)).toEqual(['84', '140', '40.0%', '40.0%'])
  })
})

describe('Plan 7 中階: 本益比 (s-pe)', () => {
  const s = () => byId('s-pe')
  it('drag the years until the pricey one pays back (60): that is the gate, and the bubble floats then (no pop)', () => {
    expect(peYears('cheap')).toBe(15) // 600 ÷ 40
    expect(peYears('pricey')).toBe(60) // 600 ÷ 10
    expect(s().until).toEqual({ control: 'periods', min: 60 })
    expect(s().scene.eventWhen).toEqual(s().until)
    expect(s().scene.event).toMatchObject({ kind: 'bubble', phase: 'float' })
    expect(controlRange(s(), 'periods')).toEqual([0, 60])
  })
  it('big number 15 年 vs 60 年; the more text says a high P/E does not mean it will fall', () => {
    // mid-r1：答案等拉到 60 年才出現
    expect(bigOf(s())).toBeUndefined()
    expect(bigOf(s(), { periods: 59 })).toBeUndefined()
    expect(bigOf(s(), { periods: 60 })).toMatchObject({ value: '15 年 vs 60 年', label: '幾年賺回股價', mark: 'illustrative' })
    expect(bigOf(s(), { periods: 60 })!.note).toContain('600')
    expect(moreOf(s(), ctx)).toContain('本益比＝股價÷每股盈餘')
    expect(moreOf(s(), ctx)).toContain('不代表一定會跌')
    expect(moreOf(s(), ctx)).toContain('假設每年賺的錢不變') // 年數的前提
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('15 年和 60 年才賺回股價')
    // 每年賺的錢是公司的獲利（不一定發給你）：不叫金幣、配息
    for (const t of [lineOf(s(), ctx), moreOf(s(), ctx)]) for (const w of ['金幣', '配息']) expect(t).not.toContain(w)
  })
})

describe('Plan 7 中階: 利率翹翹板 (b-rate)', () => {
  const s = () => byId('b-rate')
  it('drag the market rate from 2% to 5%: the gate and the freeze are both at 5%, the top of the range', () => {
    expect(controlRange(s(), 'rate')).toEqual([0.02, 0.05])
    expect(s().scene.values?.rate).toBe(0.02)
    expect(s().until).toEqual({ control: 'rate', min: 0.05 })
    expect(s().scene.eventWhen).toEqual(s().until)
    expect(s().scene.event).toMatchObject({ kind: 'freeze' })
  })
  it('the big number follows the slider: 100 at 2%, about 77 at 5% (2 × annuity(5%, 10) + 100 ÷ 1.05^10 = 76.83)', () => {
    expect(bigOf(s(), { rate: 0.02 })!.value).toBe('約 100 元')
    expect(bigOf(s(), { rate: 0.05 })!.value).toBe(`約 ${(2 * ((1 - 1.05 ** -10) / 0.05) + 100 / 1.05 ** 10).toFixed(0)} 元`)
    expect(bigOf(s(), { rate: 0.05 })!.value).toBe('約 77 元')
    expect(bigOf(s())!.note).toBe('借的人沒出問題，到期拿回 100 元。中途要賣，價格才會比較低') // mid-r2：那為什麼要怕
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖市場利率。新借據利息多，舊借據就跌') // 先原因、後結果
  })
  it('talks about the price of an existing bond, which goes back to 100 at maturity', () => {
    const more = moreOf(s(), ctx)
    expect(more).toContain('舊借據')
    expect(more).toContain('借的人沒出問題，到期拿回 100 元')
    expect(T.seesaw.maturity).toContain('借的人沒出問題') // 3D 標註也一樣（三個地方）
    expect(more).toContain('10 年')
    expect(more).toContain('2%')
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('利率到 5%，舊借據約 77 元')
  })
})

describe('Plan 7 中階: 定期定額 (e-dca)', () => {
  const s = () => byId('e-dca')
  it('drag the months 1→12 (gate at 12); the weather is a sunnyTree event with a sun that stays on screen', () => {
    expect(controlRange(s(), 'months')).toEqual([1, 12])
    expect(s().until).toEqual({ control: 'months', min: 12 })
    expect(s().scene.event).toMatchObject({ kind: 'sunnyTree' })
    expect(s().scene.eventWhen).toBeUndefined()
  })
  it('big number = average cost (total ÷ units), with the average price as the note; cost ≤ price', () => {
    const units = [50, 45, 40, 32, 25, 30, 36, 40, 45, 48, 50, 50].reduce((n, p) => n + 3000 / p, 0) // 922.92
    expect(bigOf(s(), { months: 12 })).toEqual({ value: `${(36000 / units).toFixed(1)} 元`, label: '平均成本', note: '平均價格 40.9 元', mark: 'illustrative' })
    expect(bigOf(s(), { months: 12 })!.value).toBe('39.0 元')
    expect(bigOf(s(), { months: 1 })).toMatchObject({ value: '50.0 元', note: '平均價格 50.0 元' }) // 第一個月：一樣
    for (let m = 1; m <= 12; m++) {
      const b = bigOf(s(), { months: m })!
      expect(parseFloat(b.value), `month ${m}`).toBeLessThanOrEqual(parseFloat(b.note!.replace('平均價格 ', '')))
    }
  })
  it('says it does not guarantee a profit; it only averages the cost', () => {
    expect(moreOf(s(), ctx)).toContain('只是讓成本平均')
    expect(moreOf(s(), ctx)).toContain('這是算術，只是讓成本平均，不一定比一次買完好') // 成本 ≤ 平均價格是算術，不是贏過一次買完
    expect(moreOf(s(), ctx)).toContain('不保證賺錢，價格一路跌，一樣會賠')
    expect(moreOf(s(), ctx)).toContain('平均成本 39.0 元，比平均價格 40.9 元低')
  })
})

describe('Plan 7 中階: 通膨 (b-infl)', () => {
  const s = () => byId('b-infl')
  it('no drag: the heatwave plays when the camera stops and melts the coins by the part inflation eats', () => {
    expect(s().until).toBeUndefined()
    expect(s().scene.event).toMatchObject({ kind: 'heatwave' })
    expect((s().scene.event as { melt: number }).melt).toBeCloseTo(1 - (1.05 / 1.03 - 1) / 0.05, 12)
  })
  it('big number ≈ 2%: 1.05 ÷ 1.03 − 1 = 1.94%, and the more text gives the approximation 利息 − 通膨', () => {
    expect(1.05 / 1.03 - 1).toBeCloseTo(0.0194, 4)
    expect(bigOf(s())).toEqual({ value: '約 2%', label: '扣掉通膨，真正賺到', note: '利息 5%・通膨 3%', colorKey: 'coin', mark: 'illustrative' })
    expect(moreOf(s(), ctx)).toContain('真正賺到 ≈ 利息 − 通膨')
    expect(moreOf(s(), ctx)).toContain('利息 5%，通膨 3%，真正賺到約 2%')
  })
})

describe('m-fin recap covers the Plan 7 ideas (Tasks 2–4 review)', () => {
  it('names 最大跌幅, 本益比, 利率 with 舊借據, 通膨 and 定期定額, in the same words the steps use', () => {
    const text = byId('m-fin').recap!.map((r) => r.text).join('')
    for (const w of ['最大跌幅', '本益比', '利率', '舊借據現價', '通膨', '定期定額', '讓成本平均', 'ETF 看重疊']) expect(text, w).toContain(w)
    // 同一個詞＝步驟標題或一句話裡用的詞
    for (const [id, w] of [['s-dd', '最大跌幅'], ['s-pe', '本益比'], ['b-rate', '舊借據'], ['b-infl', '通膨'], ['e-dca', '定期定額']] as const) {
      expect([byId(id).title, stripMarkup(lineOf(byId(id), ctx))].join(''), `${id}: ${w}`).toContain(w)
    }
  })
})

describe('e-dca readout formats 元 through strings.ts (whole-branch review)', () => {
  it('average cost and price use T.yuan1', () => {
    const rows = stageReadout({ kind: 'dca' }, { ...DEFAULT_VALUES, months: 12, slice: 0, explode: 0 }, universe, null)
    expect(rows.map((r) => r.value)).toEqual(['3,000 元', '922.9', '39.0 元', '40.9 元'])
    expect(T.yuan1(39.03)).toBe('39.0 元')
  })
})

describe('mid-r1: comparisons never read as advice', () => {
  /** 兩種以上的商品或做法並排的舞台 */
  const sideBySide = (s: Step): boolean => {
    const st = s.scene.stage
    if (!st) return false
    if (st.kind === 'held') return st.items.length >= 2
    if (st.kind === 'underground') return (st.cores ?? []).length >= 2
    return ['bonds', 'feeRace', 'accumulate', 'overlap', 'shock', 'pe', 'duration', 'feeTrees', 'hedge'].includes(st.kind)
  }

  it('the compare note sits only where a side-by-side outcome could be read as a pick (mid-r2: on 15 steps it became wallpaper)', () => {
    const flagged = steps.filter((s) => s.compare).map((s) => s.id).sort()
    expect(flagged).toEqual(['a-dur', 'a-fee30', 'a-hedge', 'c-3', 'e-dca', 'f-6', 'f-8', 's-pe'].sort())
    for (const id of flagged) if (id !== 'e-dca') expect(sideBySide(byId(id)), id).toBe(true)
    expect(T.compareNote).toBe('只是比較，不是叫你買或賣')
    expect(forbiddenWordsIn(T.compareNote)).toEqual([])
  })

  it('f-8 shows what the gap is (coins that keep growing), computed and hidden before the drag', () => {
    const f8 = byId('f-8')
    expect(bigOf(f8, { periods: 0 })).toBeUndefined()
    const r = accumulateVsPayout(20)
    expect(r.payout.total).toBeCloseTo(r.payout.value + r.payout.cashReceived, 9)
    // mid-r2：大數字＝差多少（金幣再滾出來的），不是「誰比較多」：387.0 − (180.6 + 107.5) = 98.9
    expect(bigOf(f8, { periods: 20 })).toEqual({ value: wan(r.accumulate.value - r.payout.total), label: '差別＝金幣再滾出來的', note: '配息型：金幣能先用；累積型：讓它繼續滾', colorKey: 'coin', mark: 'illustrative' })
    expect(bigOf(f8, { periods: 20 })!.value).toBe('98.9 萬')
    expect(stripMarkup(lineOf(f8, ctx))).toBe('拖經過年數。差別：金幣有沒有繼續滾')
    expect(moreOf(f8, ctx)).toContain('發的那一刻總數不變') // 和 s-5 接起來
    expect(moreOf(f8, ctx)).toContain('能拿去用')
  })

  it('f-6 says on screen that it only counts fees, not market moves', () => {
    expect(bigOf(byId('f-6'))!.note).toContain('只算費用，沒算漲跌')
    expect(T.towers.feesOnly).toBe('只算費用，沒算漲跌')
  })

  it('s-dd answers "is 40% a lot?" honestly on the card, and its line no longer reads 最多少掉多少', () => {
    expect(bigOf(byId('s-dd'), { tick: 5 })!.note).toBe('股票常見；跌完不一定很快長回來')
    expect(stripMarkup(lineOf(byId('s-dd'), ctx))).toBe('拖時間軸。找出跌最深那次')
  })
})

describe('mid-r1: the background city steps back on 中階 teaching steps', () => {
  it('every 中階 step with a plaza stage or an exchange product dims the city; city-subject steps do not', () => {
    const mid = new Set(courseSteps(COURSES.find((c) => c.id === 'intermediate')!).map((s) => s.id))
    for (const s of steps) {
      if (!mid.has(s.id)) continue
      const prop = (s.scene.stage && ON_PLAZA.has(s.scene.stage.kind)) || !!s.scene.product
      expect(!!s.scene.cityDim, s.id).toBe(prop)
    }
    for (const id of ['f-2', 'f-3', 'f-4', 'f-8', 'e-4', 'c-3']) expect(byId(id).scene.cityDim, id).toBe(true)
  })
})

describe('mid-r2: s-pe says 比較貴, never 泡沫', () => {
  it('the bubble label is plain and the profit stacks say whose profit they are', () => {
    expect(T.pe.bubble).toBe('比較貴')
    expect(T.pe.bubbleSub).toBe('不代表一定會跌')
    expect(T.pe.years(15)).toBe('15 年的獲利')
    expect(T.pe.sub(600, 40)).toContain('公司每年賺')
    for (const t of [T.pe.bubble, T.pe.bubbleSub, lineOf(byId('s-pe'), ctx), moreOf(byId('s-pe'), ctx)]) expect(t).not.toContain('泡沫')
    expect(byId('s-pe').scene.event).toMatchObject({ kind: 'bubble', phase: 'float' }) // 不破
  })
})

describe('mid-r2: 總報酬 is named where it is taught (s-6), before the m-fin recap uses it', () => {
  it('s-6 big-number label uses the exact term', () => {
    expect(bigOf(byId('s-6'))!.label).toBe('總報酬（方塊＋金幣）變少')
    expect(byId('m-fin').recap!.some((r) => r.text.includes('總報酬'))).toBe(true)
    const ids = courseSteps(COURSES.find((c) => c.id === 'intermediate')!).map((s) => s.id)
    const first = ids.find((id) => { const s = byId(id); return [s.title, stripMarkup(lineOf(s, ctx)), bigOf(s)?.label ?? ''].some((t) => t.includes('總報酬')) })
    expect(first).toBe('s-6')
  })
})

describe('mid-r1 carried into 高階: the city steps back on prop steps', () => {
  it('every 高階 step with a plaza stage dims the city; recap steps on the overview do not', () => {
    const adv = courseSteps(COURSES.find((c) => c.id === 'advanced')!)
    for (const s of adv) expect(!!s.scene.cityDim, s.id).toBe(!!s.scene.stage && ON_PLAZA.has(s.scene.stage.kind))
  })
})

describe('Plan 8 高階: 自己蓋組合塔 (a-port)', () => {
  const s = () => byId('a-port')
  it('drag the bond share 0 → 40% (gate); a second slider picks the storm; the 🌪 storm sweeps on entry and the card waits until it reaches the tower', () => {
    expect(s().controls).toEqual(['bondPct', 'storm'])
    expect(s().scene.values).toMatchObject({ bondPct: 0, storm: 0 })
    expect(controlRange(s(), 'bondPct')).toEqual([0, 80])
    expect(controlRange(s(), 'storm')).toEqual([0, 1])
    expect(s().until).toEqual({ control: 'bondPct', min: 40 })
    expect(s().scene.event).toEqual({ kind: 'tornado', numberAtX: 0 })
    expect(s().scene.eventWhen).toBeUndefined()
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖債券比例。看風暴後少多少')
  })
  it('big number: how much this tower lost, with the storm assumption on the card (adv-r1: bonds +5% must be visible as an assumption)', () => {
    expect(bigOf(s(), { bondPct: 0 })).toEqual({ value: '40%', label: '這座塔在風暴裡少掉', note: '假設：股票跌 40%、債券漲 5%', colorKey: 'loss', mark: 'illustrative' }) // 100 × 0.4
    expect(bigOf(s(), { bondPct: 40 })!.value).toBe('22%') // 100 − (60 × 0.6 + 40 × 1.05) = 100 − 78
    expect(bigOf(s(), { bondPct: 80 })!.value).toBe('4%') // 100 − (12 + 84)
    // 股債一起跌（像 2022 年；示意）：60 × 0.75 + 40 × 0.85 = 79 → 少 21%
    expect(bigOf(s(), { bondPct: 40, storm: 1 })).toMatchObject({ value: '21%', note: '假設：股票跌 25%、債券跌 15%' })
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('四成債券，風暴後少掉 22%')
  })
  it('says the storm is an example, numbers are assumed, and stocks and bonds can fall together (like 2022) — no specific historical figures', () => {
    expect(moreOf(s(), ctx)).toContain('數字是假設的')
    expect(moreOf(s(), ctx)).toContain('像 2022 年那樣，股債也會一起跌')
    expect(moreOf(s(), ctx)).not.toMatch(/2022 年[^，。]*\d+%/)
    expect(resolve(s().fallbackMore)).toContain('四成債券也少掉 21%')
  })
})

describe('Plan 8 高階: 一起跌或抵消 (a-corr)', () => {
  const s = () => byId('a-corr')
  it('no drag: ⚡ strikes A in both pairs when the camera stops (targets = the A blocks)', () => {
    expect(s().until).toBeUndefined()
    expect(s().scene.event).toMatchObject({ kind: 'lightning', phase: 'strike' })
    expect((s().scene.event as { targets: readonly unknown[] }).targets).toHaveLength(2)
    expect(stripMarkup(lineOf(s(), ctx))).toBe('一起動的一起跌，一上一下的抵消')
  })
  it('big number: half-half, together falls 6% and opposite 0% that day (−8 − 4) ÷ 2, (−8 + 8) ÷ 2', () => {
    expect(bigOf(s())).toEqual({ value: '6% vs 0%', label: '⚡ 那天，兩顆合起來跌', note: '一起動 vs 一上一下；各放一半', colorKey: 'loss', mark: 'illustrative' })
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('一起動跌 6%。一上一下 0%')
  })
  it('the more text is honest: correlation changes and in big falls things often fall together', () => {
    expect(moreOf(s(), ctx)).toContain('相關性＝')
    expect(moreOf(s(), ctx)).toContain('大跌時常一起跌')
  })
  it('the readout gives how much each one swings over the example: 10%, 8%, 2%', () => {
    const rows = stageReadout({ kind: 'correlation' }, { ...DEFAULT_VALUES, slice: 0, explode: 0 }, universe, null)
    expect(rows.map((r) => r.value)).toEqual(['10.0%', '8.0%', '2.0%'])
  })
})

describe('Plan 8 高階: 當沖的成本 (a-dt)', () => {
  const s = () => byId('a-dt')
  it('drag the trades 0 → 250 (gate); two more sliders: fee discount (2.8 折–不打折) and win rate (50%–75%); the card is hidden before the drag', () => {
    expect(s().controls).toEqual(['trades', 'feeDiscount', 'winRate'])
    expect(controlRange(s(), 'trades')).toEqual([0, 250])
    expect(controlRange(s(), 'feeDiscount')).toEqual([0.28, 1])
    expect(controlRange(s(), 'winRate')).toEqual([0.5, 0.75])
    expect(s().until).toEqual({ control: 'trades', min: 250 })
    expect(bigOf(s(), { trades: 0 })).toBeUndefined()
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖進出次數。看交易成本吃掉多少')
  })
  it('big number follows all three sliders; the note gives the break-even win rate (the sim’s breakEvenWinRate) and the cost per trade', () => {
    expect(bigOf(s(), { trades: 250 })).toEqual({ value: '33.6 萬', label: '進出 250 次後的本金', note: '打平要勝率 71.75%（每次成本 0.435%）', colorKey: 'stock', mark: 'illustrative' }) // 100 × 0.99565^250；(1% + 0.435%) ÷ 2%
    // 2.8 折：0.1425% × 0.28 × 2 + 0.15% = 0.2298%；100 × 0.997702^250 = 56.3；打平 (1% + 0.2298%) ÷ 2% = 61.49%
    expect(bigOf(s(), { trades: 250, feeDiscount: 0.28 })).toMatchObject({ value: '56.3 萬', note: '打平要勝率 61.49%（每次成本 0.230%）' })
    // 勝率 75%、不打折：每次 +0.065% → 100 × 1.00065^250 = 117.6
    expect(bigOf(s(), { trades: 250, winRate: 0.75 })!.value).toBe('117.6 萬')
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('進出 250 次。本金剩 33.6 萬')
  })
  it('the more text calls 0.1425% the posted rate (公告費率, not 上限), the ≈ example, and no 稅', () => {
    const more = moreOf(s(), ctx)
    expect(more).toContain('手續費公告費率 0.1425%，可拉折數看看')
    expect(more).toContain('賺賠各 1%、一年 250 次是示意')
    expect(more).not.toContain('上限')
    expect(more).not.toContain('稅')
  })
  it('the research card: < 1% beat the market reliably after costs (2014, Taiwan 1992–2006), 97% likely to lose in future day trading (2020); full citations + DOI for 多說一點', () => {
    const card = s().research!(ctx)
    expect(card.rows.map((r) => r.value)).toEqual(['不到 1%', '97%'])
    expect(card.rows.map((r) => r.source)).toEqual(['Barber 等 2014・台灣 1992–2006', 'Barber 等 2020'])
    expect(card.rows.every((r) => r.mark === undefined)).toBe(true)
    expect(card.refs!.map((r) => r.doi)).toEqual(['https://doi.org/10.1016/j.finmar.2013.05.006', 'https://doi.org/10.1093/rapstu/raz006'])
    expect(card.refs![0]!.citation).toContain('Journal of Financial Markets')
    expect(stepMarks(s(), universe)).toEqual(['illustrative'])
    for (const t of [...card.rows.flatMap((r) => [r.value, r.text, r.source ?? '']), card.cite]) {
      expect(t).not.toContain('稅')
      expect(t.includes('被')).toBe(false)
      expect(forbiddenWordsIn(t)).toEqual([])
    }
    for (const r of card.rows) expect(Array.from(r.text).length, r.text).toBeLessThanOrEqual(18)
    expect(card.rows[0]!.text).toContain('穩定') // 不是「當年有賺的人」
    expect(card.rows[1]!.text).toContain('很可能') // 不是「已經賠了」
  })
})

describe('Plan 8 高階: 長短借據 (a-dur)', () => {
  const s = () => byId('a-dur')
  it('drag the market rate 2% → 3%: the gate and the cold front are both at 3%', () => {
    expect(controlRange(s(), 'rate')).toEqual([0.02, 0.03])
    expect(s().scene.values?.rate).toBe(0.02)
    expect(s().until).toEqual({ control: 'rate', min: 0.03 })
    expect(s().scene.eventWhen).toEqual(s().until)
    expect(s().scene.event).toMatchObject({ kind: 'freeze' })
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖市場利率。長借據跌更多')
  })
  it('big number: 2-year −1.9% vs 20-year −14.9% at 3% (hidden before the drag); held to maturity both return 100', () => {
    expect(bigOf(s(), { rate: 0.02 })).toBeUndefined()
    expect(bigOf(s(), { rate: 0.03 })).toEqual({ value: '1.9% vs 14.9%', label: '短借據 vs 長借據跌', note: '利率 2%→3%；到期都拿回 100', colorKey: 'loss', mark: 'illustrative' })
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('利率漲 1%。長借據跌 14.9%')
  })
  it('the more text says both directions (rates falling lift the long IOU more) and the example numbers', () => {
    expect(moreOf(s(), ctx)).toContain('存續期間＝')
    expect(moreOf(s(), ctx)).toContain('利率跌時，長借據也漲比較多')
    expect(moreOf(s(), ctx)).toContain('示意：2 年和 20 年，利率 2% 漲到 3%')
  })
})

describe('Plan 8 高階: 主動 vs 被動 30 年 (a-fee30)', () => {
  const s = () => byId('a-fee30')
  it('drag the years 0 → 30 (gate); 🌤 the sunny weather comes on entry', () => {
    expect(controlRange(s(), 'periods')).toEqual([0, 30])
    expect(s().until).toEqual({ control: 'periods', min: 30 })
    expect(s().scene.event).toMatchObject({ kind: 'sunnyTree' })
    expect(s().scene.eventWhen).toBeUndefined()
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖經過年數。費用差一點，樹差很多')
  })
  it('big number: after 30 years 550.7 − 325.0 = 225.7 萬 apart; the card says the return before fees is assumed equal', () => {
    expect(bigOf(s(), { periods: 0 })).toBeUndefined()
    expect(bigOf(s(), { periods: 30 })).toEqual({ value: '差 225.7 萬', label: '30 年後，兩棵樹差', note: '假設扣費前報酬一樣，每年 6%', mark: 'illustrative' })
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('30 年後。兩棵樹差 225.7 萬')
  })
  it('fees come from the data (1.88% vs 0.14%) and ？ appears if either is unverified', () => {
    expect(moreOf(s(), ctx)).toContain('這檔基金扣 1.88%，0050 扣 0.14%')
    expect(moreOf(s(), ctx)).toContain('扣費前誰賺得多不一定')
    expect(stepMarks(s(), universe)).toEqual(['illustrative'])
    expect(stepMarks(s(), unverify(['JH_BALANCED']))).toEqual(['illustrative', 'unverified'])
  })
})

describe('Plan 8 高階: 槓桿的耗損 (a-lev)', () => {
  const s = () => byId('a-lev')
  it('no drag: 🌊 five waves, each knocks the 2× tower down; generic names only', () => {
    expect(s().until).toBeUndefined()
    expect(s().scene.event).toMatchObject({ kind: 'wave', waves: 5 })
    expect(stripMarkup(lineOf(s(), ctx))).toBe('大盤來回晃，2 倍塔越來越矮')
    for (const t of [lineOf(s(), ctx), moreOf(s(), ctx)]) expect(t).not.toMatch(/\d{4,5}[LR]?|00631|00632/) // 沒有真實代號
  })
  it('big number: the 2× tower falls 18.5% (100 × 0.96^5 = 81.54) while the market falls 4.9% and the inverse tower falls 4.9% too', () => {
    // 大盤 −4.90% → 以為 2 倍是 −9.80%；實際 100 × 0.96^5 = 81.54 → −18.46%
    expect(bigOf(s())).toEqual({ value: '跌 18.5%', label: '5 次來回後 2 倍塔', note: '以為 2 倍會跌 9.8%，實際跌 18.5%', colorKey: 'double', mark: 'illustrative' })
    expect(s().scene.event).toMatchObject({ numberAtEnd: true }) // 浪退了才數
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('來回 5 次。2 倍塔跌 18.5%')
  })
  it('the more text does the one-round arithmetic: market −1%, 2× −4%, inverse −1%', () => {
    expect(moreOf(s(), ctx)).toContain('跌 10% 再漲 10%，大盤也少 1%')
    expect(moreOf(s(), ctx)).toContain('2 倍塔少 4%，反向塔也少 1%')
    expect(moreOf(s(), ctx)).toContain('不是真實商品')
  })
})

describe('Plan 8 高階: 反向來對沖 (a-hedge)', () => {
  const s = () => byId('a-hedge')
  it('drag the case: choppy year → big-rise year → 🌋 big-fall day (gate); a market crash is a quake (spec §4), not ⚡', () => {
    expect(controlRange(s(), 'hedgeCase')).toEqual([0, 2])
    expect(s().until).toEqual({ control: 'hedgeCase', min: 2 })
    expect(s().scene.eventWhen).toEqual(s().until)
    expect(s().scene.event).toMatchObject({ kind: 'quake', depth: 0.1 })
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖情境。🌋 時少賠，平時少賺')
    for (const t of [lineOf(s(), ctx), moreOf(s(), ctx), bigOf(s(), { hedgeCase: 2 })!.label]) expect(t).not.toContain('⚡')
  })
  it('both sides on the card, each next to cash: choppy year costs ≈2.0 (decay + fee), big rise costs 10.7, 🌋 day saves 4.0 — and cash saves the same 4.0', () => {
    // 來回晃：99.86 − (79.888 + 20 × 0.999216^125 × 0.99) = 2.02；現金 60 × 0.9986 + 40 = 99.916 ≥ 99.86 → 不用付
    expect(bigOf(s(), { hedgeCase: 0 })).toEqual({ value: '2.0 萬', label: '來回晃一年：加反向的代價', note: '少買 0050 改留現金：不用付', colorKey: 'loss', mark: 'illustrative' })
    // 大漲 30%：129.818 − (103.854 + 20 × (1 − d)^250 × 0.99)，d = 1.3^(1/250) − 1；現金 129.818 − (77.891 + 40)
    expect(bigOf(s(), { hedgeCase: 1 })).toMatchObject({ value: '少賺 10.7 萬', label: '大漲那年：加反向少賺', note: '少買 0050 改留現金：少賺 11.9 萬' })
    expect(bigOf(s(), { hedgeCase: 2 })).toEqual({ value: '少賠 4.0 萬', label: '🌋 大跌那天：加反向少賠', note: '少買 0050 改留現金：一樣少賠 4.0 萬', mark: 'illustrative' }) // 94 − 90；(60 × 0.9 + 40) − 90
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('大跌少賠 4 萬。大漲少賺 11 萬')
  })
  it('carries ≈ for the step and ✎ for the assumed 1% inverse fee (from sim/hedge), in the title row', () => {
    expect(stepMarks(s(), universe)).toEqual(['illustrative', 'assumption'])
    expect(stepMarks(s(), unverify(['0050']))).toEqual(['illustrative', 'assumption', 'unverified'])
    expect(moreOf(s(), ctx)).toContain('費用假設一年 1%')
    expect(moreOf(s(), ctx)).toContain('來回晃也會磨掉')
    expect(moreOf(s(), ctx)).toContain('少買 0050、多留現金，🌋 時也一樣少賠')
  })
})

describe('Plan 8 高階: 剪高補低 (a-rebal)', () => {
  const s = () => byId('a-rebal')
  it('drag the progress: start → stocks grew → trim and top up (gate)', () => {
    expect(controlRange(s(), 'rebal')).toEqual([0, 2])
    expect(s().until).toEqual({ control: 'rebal', min: 2 })
    expect(stripMarkup(lineOf(s(), ctx))).toBe('拖進度。塔歪了就剪高補低')
  })
  it('one clear change per position: 股票 60% → 股票 66% (78 ÷ 118, the tower leans) → 搬了 7.2 萬 (back to 60%, total 118 unchanged)', () => {
    expect(bigOf(s(), { rebal: 0 })).toMatchObject({ value: '股票 60%', label: '組合裡的股票比例', note: '目標：股票 60%', colorKey: 'stock', mark: 'illustrative' })
    expect(bigOf(s(), { rebal: 1 })).toMatchObject({ value: '股票 66%', note: '一年後股票漲 30%，塔歪了' })
    expect(bigOf(s(), { rebal: 2 })).toMatchObject({ value: '搬了 7.2 萬', label: '從股票搬到債券', note: '股票回到 60%；總數 118 萬不變' })
    const values = [0, 1, 2].map((r) => bigOf(s(), { rebal: r })!.value)
    expect(new Set(values).size).toBe(3) // 每一格都不一樣
    expect(stripMarkup(resolve(s().fallbackLine)!)).toBe('股票漲到 66%。剪 7.2 萬補債券')
  })
  it('honest: rebalancing does not promise more profit, and moving money has trading costs', () => {
    expect(moreOf(s(), ctx)).toContain('不保證賺比較多')
    expect(moreOf(s(), ctx)).toContain('交易成本')
  })
})
