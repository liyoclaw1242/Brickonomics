import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { overlap } from '../sim/overlap'
import { LEVELS } from './levels'
import { makeTextContext } from './context'
import { lineOf, moreOf } from './engine'
import { ACTION_VERBS, forbiddenWordsIn, LINE_SENTENCE_MAX, LINE_SENTENCES_MAX, MORE_SENTENCE_MAX, MORE_SENTENCES_MAX, sentences } from './glossary'
import { parseEmphasis, stripMarkup, visibleLength } from '../ui/emphasis'
import { colorForKey } from '../scene/palette'
import type { Stage, Step } from './types'

const ctx = makeTextContext(universe)
const steps = LEVELS.flatMap((l) => l.steps)
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'exchangeWide', 'exchangeSide', 'plaza', 'plazaNear', 'underground']

const byId = (id: string): Step => steps.find((s) => s.id === id)!
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
    expect(byId('c-2').bigNumber!(ctx)!.fraction).toBeCloseTo(0.5631, 4) // 0.16893 / 0.3
  })

  it('renders every text without errors, non-empty, and never mentions 稅', () => {
    for (const s of steps) {
      expect(s.title.length, s.id).toBeGreaterThan(0)
      expect(lineOf(s, ctx).length, s.id).toBeGreaterThan(3)
      expect(moreOf(s, ctx).length, s.id).toBeGreaterThan(10)
      const all = [s.title, lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore)]
      const bn = s.bigNumber?.(ctx)
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
      const bn = s.bigNumber?.(ctx)
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
      const bk = s.bigNumber?.(ctx)?.colorKey
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
      const bn = s.bigNumber?.(ctx)
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
    expect(e3.bigNumber!(ctx)).toEqual({ value: '56%', label: '台積電在 0050', fraction: 0.5631, colorKey: '2330' })
    const c2 = byId('c-2')
    expect(lineOf(c2, ctx)).toContain('−16.9%') // -0.3 * 56.31% = -16.893%
    expect(c2.bigNumber!(ctx)!.value).toBe('−16.9%')
    expect(byId('f-5').bigNumber!(ctx)!.value).toBe('1.88%') // JH_BALANCED expenseRatio 0.0188
    expect(byId('e-5').bigNumber!(ctx)!.value).toBe('0.18%') // QQQ expenseRatio 0.0018
    expect(byId('c-3').bigNumber!(ctx)!.value).toBe(`至少 ${(overlap(universe, 'QQQ', 'SPY').total * 100).toFixed(1)}%`)
    expect(byId('s-6').bigNumber!(ctx)).toEqual({ value: '100', label: '方塊 95 ＋ 金幣 5', mark: 'illustrative' }) // EXDIV 100 − 5 + 5
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

  it('u-2 says the semiconductor share is a lower bound', () => {
    expect(moreOf(byId('u-2'), ctx)).toContain('至少約')
    expect(lineOf(byId('u-2'), ctx)).toContain('至少')
    expect(byId('u-2').bigNumber!(ctx)!.value.startsWith('至少')).toBe(true)
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
    expect(moreOf(byId('f-4'), ctx)).toContain('32%')
    expect(byId('f-4').bigNumber!(ctx)!.value).toBe('可轉債 32%') // pct0(31.98)
    expect(moreOf(byId('e-3'), ctx)).toContain('7%') // 2454: pct0(6.71)
  })
})
