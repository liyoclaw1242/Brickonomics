import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { overlap } from '../sim/overlap'
import { EXDIV_AFTER_PHASE, LEVELS } from './levels'
import { exDivTimeline } from '../scene/layout/stages'
import { makeTextContext, pct0 } from './context'
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
      'f-7': [['SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'fees.cdsc']],
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
    expect(bigOf(c2)!.value).toBe('−16.9%')
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

  it('s-6 shows the result without another drag: cause in plain words, total down in red', () => {
    const s6 = byId('s-6')
    expect(s6.title).toBe('方塊沒長回來')
    expect(s6.controls).toBeUndefined()
    expect(s6.until).toBeUndefined()
    const line = stripMarkup(lineOf(s6, ctx))
    expect(line).toContain('不爭氣') // 原因（白話）
    expect(line).toContain('沒長回來') // 結果
    // 95 ＋ 5 之後貼息到 92：92 ＋ 5 ＝ 97，紅色
    expect(bigOf(s6)).toMatchObject({ value: '97', label: '方塊 92＋金幣 5', colorKey: 'loss', mark: 'illustrative' })
    expect(bigOf(s6)!.fraction).toBeCloseTo(0.97, 6)
    expect(moreOf(s6, ctx)).toContain('剩 97')
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

  it('f-4 is purely visual: another 怪手 picked a different tower (股票 vs 借據), no jargon on screen', () => {
    const f4 = byId('f-4')
    const onScreen = [f4.title, stripMarkup(lineOf(f4, ctx)), ...(f4.callouts ?? []).flatMap((c) => [resolve(c.title)!, resolve(c.sub) ?? ''])]
    for (const t of onScreen) expect(t, t).not.toMatch(/可轉債|高收益債|多重資產|安聯|平衡|檔|同名/)
    expect(stripMarkup(lineOf(f4, ctx))).toContain('股票＋借據') // 事實：股票＋借據（不說它是平衡型）
    expect(stripMarkup(lineOf(f4, ctx))).toContain('怪手挑的不一樣')
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

  it('f-6 and f-7 show only the two fund towers: 0050 is not named before the ETF chapter', () => {
    for (const id of ['f-6', 'f-7']) expect(byId(id).scene.stage, id).toMatchObject({ kind: 'feeRace', etf: false })
    const firstEtf = steps.findIndex((s) => s.id === 'e-1')
    for (const s of steps.slice(0, firstEtf)) {
      const texts = [s.title, lineOf(s, ctx), moreOf(s, ctx), resolve(s.fallbackLine), resolve(s.fallbackMore), ...(s.callouts ?? []).flatMap((c) => [resolve(c.title), resolve(c.sub)])]
      for (const t of texts) if (t !== undefined) expect(t.includes('0050'), `${s.id}: ${t}`).toBe(false)
    }
  })

  it('f-6 and f-7 carry their marks once, next to the title: ✎ assumption and ？ unverified (from the data)', () => {
    expect(stepMarks(byId('f-6'), universe)).toEqual(['assumption', 'unverified'])
    expect(stepMarks(byId('f-7'), universe)).toEqual(['assumption', 'unverified'])
    expect(stepMarks(byId('s-5'), universe)).toEqual(['illustrative'])
    expect(stepMarks(byId('p-1'), universe)).toEqual([])
  })

  it('f-7 looks different from f-6: back-load only, from year 0, exit fee shrinking to 0', () => {
    const f6 = byId('f-6')
    const f7 = byId('f-7')
    expect(f7.scene.stage).toEqual({ kind: 'feeRace', focus: 'back', etf: false })
    expect(f7.scene.values?.years).toBe(0)
    expect(f7.controls).toEqual(['years'])
    expect(f7.until?.control).toBe('years')
    expect(controlRange(f7, 'years')[1]).not.toBe(controlRange(f6, 'years')[1]) // 拉到底的結果不同
    // 出門費（CDSC）：未滿 1 年 3%，滿 3 年 0%（資料：[0.03, 0.02, 0.01]）
    expect(bigOf(f7)).toMatchObject({ value: '3%', colorKey: 'loss', fraction: 1 })
    expect(bigOf(f7, { years: 1 })!.value).toBe('2%')
    expect(bigOf(f7, { years: controlRange(f7, 'years')[1] })).toMatchObject({ value: '0%', fraction: 0 })
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
