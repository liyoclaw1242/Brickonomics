import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { overlap } from '../sim/overlap'
import { EXDIV_AFTER_PHASE, LEVELS, ROUTES } from './levels'
import { exDivTimeline } from '../scene/layout/stages'
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
import type { Stage, StageValues, Step } from './types'

const ctx = makeTextContext(universe)
const steps = LEVELS.flatMap((l) => l.steps)
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'exchangeWide', 'exchangeSide', 'plaza', 'plazaNear', 'underground']

const byId = (id: string): Step => steps.find((s) => s.id === id)!
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
    const illustrative = new Set(['exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker'])
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
      'e-3': [['0050', 'holdings']],
      'e-5': [['QQQ', 'fees.expenseRatio']],
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
    const used = (s: Step): Set<string> => {
      const seen = new Set<string>()
      const rec = new Proxy(ctx, {
        get: (t, k: keyof typeof ctx) => {
          const f = t[k] as (...a: never[]) => unknown
          return (...a: never[]) => {
            if (k === 'weightPct' || k === 'assetClassPct' || k === 'sectorPct') seen.add(String(a[0]))
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
    let checked = 0
    for (const s of steps) {
      for (const id of used(s)) {
        const a = universe.get(id)
        if (a && !isVerified(a, 'holdings')) {
          checked++
          expect(stepMarks(s, universe), `${s.id}: shows numbers from ${id} holdings, which are unverified`).toContain('unverified')
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
    expect(stepMarks(byId('f-2'), universe)).toContain('unverified')
    expect(stepMarks(byId('f-4'), universe)).toContain('unverified')
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
    const illustrative = new Set(['held', 'exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker'])
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
    expect(bigOf(byId('f-5'))!.value).toBe('1.88%') // JH_BALANCED expenseRatio 0.0188
    expect(bigOf(byId('e-5'))!.value).toBe('0.18%') // QQQ expenseRatio 0.0018
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
    expect(byId('f-6').controls).toEqual(['years'])
    expect(byId('f-6').mark).toBe('assumption') // 預設的前收手續費仍是假設值
  })

  it('b-2 ranks the three bonds on the stage; b-3 stresses them', () => {
    expect(byId('b-2').scene.stage).toEqual({ kind: 'bonds', stressed: false, ranks: true })
    expect(byId('b-3').scene.stage).toMatchObject({ kind: 'bonds', stressed: true })
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
    expect(subs[0]).toContain(`約 ${pct0(ctx.assetClassPct('JH_BALANCED', 'stock'))}%`) // 64.15 → 64
    expect(subs[0]).toContain('輝達')
    expect(subs[1]).toBe(`約 ${pct0(ctx.assetClassPct('JH_BALANCED', 'bond'))}%`) // 34.55 → 35
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
      `約 ${pct0(ctx.assetClassPct('ALLIANZ_INCOME_GROWTH', 'bond'))}%`,
    ])
    expect((f4.callouts ?? []).map((c) => resolve(c.sub))).toEqual(['約 32%', '約 62%'])
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
    expect(stepMarks(byId('f-6'), universe)).toEqual(['assumption', 'unverified'])
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
    const line = stripMarkup(lineOf(f6, ctx))
    for (const w of ['前收', '進門', '後收', '出門']) expect(line, w).toContain(w)
    expect(stripMarkup(resolve(f6.fallbackLine)!)).not.toMatch(/^拖/) // 文字版沒有拉桿
    // 大數字＝後收「現在賣」要付的出門費，100 萬為底、單位萬（跟 3D 的出門費標籤同一個數字）
    expect(bigOf(f6, { years: 0 })).toMatchObject({ value: '3 萬', colorKey: 'loss', fraction: 1 }) // 100 × 3%
    expect(bigOf(f6, { years: 1 })!.value).toBe('2 萬') // 賣前 97.911 × 2% = 1.958
    expect(bigOf(f6, { years: 2 })!.value).toBe('1 萬') // 賣前 95.866 × 1% = 0.959
    expect(bigOf(f6, { years: 3 })).toMatchObject({ value: '0 萬', fraction: 0 })
    for (let y = 0; y <= 10; y += 0.5) expect(bigOf(f6, { years: y })!.value, `year ${y}`).toBe(wan(ctx.fundFeeRows(y, DEFAULT_VALUES.frontLoad)[1]!.exit))
    expect(bigOf(f6)!.label).not.toMatch(/0%|免費/)
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
    for (const s of fund.steps) {
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
    for (const r of u6.recap!) {
      expect(r.icon.length).toBeGreaterThan(0)
      expect(Array.from(r.text).length, r.text).toBeLessThanOrEqual(18)
      expect(forbiddenWordsIn(r.text)).toEqual([])
    }
    expect(T.finish).toBe('自由玩')
    for (const s of steps) for (const t of [lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore)]) {
      if (t !== undefined) expect(t.includes('沙盒'), s.id).toBe(false)
    }
  })
})

describe('ROUTES', () => {
  const order = steps.map((s) => s.id)
  it('full walks every step', () => {
    expect(ROUTES.full).toBeNull()
  })
  it('simple is the 17 kept steps, each one exists, in course order', () => {
    const simple = ROUTES.simple!
    expect(simple).toEqual(['p-1', 'p-2', 's-1', 's-2', 's-3', 'b-1', 'b-3', 'f-1', 'f-5', 'f-9', 'e-1', 'e-2', 'e-3', 'e-5', 'c-1', 'c-2', 'u-6'])
    for (const id of simple) expect(order, id).toContain(id)
    const idx = simple.map((id) => order.indexOf(id))
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(new Set(simple).size).toBe(simple.length)
  })
  it('simple ends with the recap step, and every chapter keeps at least one step', () => {
    expect(byId(ROUTES.simple!.at(-1)!).recap).toBeDefined()
    for (const l of LEVELS) expect(l.steps.some((s) => ROUTES.simple!.includes(s.id)), l.id).toBe(true)
  })
})
