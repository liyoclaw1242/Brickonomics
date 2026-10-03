import { describe, it, expect, beforeEach } from 'vitest'
import { useSandbox, effectiveExplode, parseSandboxQuery } from './sandbox'

const known = new Set(['0050', 'QQQ'])

beforeEach(() => useSandbox.setState(useSandbox.getInitialState()))

describe('useSandbox', () => {
  it('starts on 0050 with nothing cut, exploded or picked', () => {
    const s = useSandbox.getState()
    expect(s.productId).toBe('0050')
    expect(s.slice).toBe(0)
    expect(s.explode).toBe(0)
    expect(s.picked).toBeNull()
  })

  it('selecting a product resets cut, explode and pick', () => {
    const s = useSandbox.getState()
    s.setSlice(0.5)
    s.setExplode(0.7)
    s.pick({ productId: '0050', holdingId: '2330' })
    s.selectProduct('QQQ')
    expect(useSandbox.getState()).toMatchObject({ productId: 'QQQ', slice: 0, explode: 0, picked: null })
  })

  it('re-selecting the same product keeps cut, explode and pick', () => {
    const s = useSandbox.getState()
    s.setSlice(0.5)
    s.setExplode(0.3)
    s.pick({ productId: '0050', holdingId: '2330' })
    s.selectProduct('0050')
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 0.5, explode: 0.3, picked: { productId: '0050', holdingId: '2330' } })
  })

  it('ignores unknown or non-basket product ids', () => {
    const s = useSandbox.getState()
    s.setSlice(0.5)
    s.selectProduct('NOPE')
    s.selectProduct('2330')
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 0.5 })
  })

  it('clamps slider values to [0, 1] and maps NaN to 0', () => {
    const s = useSandbox.getState()
    s.setSlice(2)
    expect(useSandbox.getState().slice).toBe(1)
    s.setExplode(-1)
    expect(useSandbox.getState().explode).toBe(0)
    s.setSlice(Number.NaN)
    expect(useSandbox.getState().slice).toBe(0)
  })

  it('holding the explode key overrides the slider', () => {
    expect(effectiveExplode({ explode: 0.2, explodeHeld: false })).toBe(0.2)
    expect(effectiveExplode({ explode: 0.2, explodeHeld: true })).toBe(1)
  })
})

describe('resetSandbox and applyScene', () => {
  it('resetSandbox returns to the initial state', () => {
    const s = useSandbox.getState()
    s.selectProduct('QQQ')
    s.setSlice(0.5)
    s.resetSandbox()
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 0, explode: 0, picked: null, sliceAxis: 'x' })
  })

  it('applyScene sets fields even for the same product, and clamps', () => {
    const s = useSandbox.getState()
    s.setSlice(0.7)
    s.applyScene({ productId: '0050', slice: 2, explode: 0.5, sliceAxis: 'd', picked: null })
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 1, explode: 0.5, sliceAxis: 'd' })
  })

  it('applyScene accepts null (no basket) and rejects non-baskets', () => {
    useSandbox.getState().applyScene({ productId: null })
    expect(useSandbox.getState().productId).toBeNull()
    expect(() => useSandbox.getState().applyScene({ productId: '2330' })).toThrow(RangeError)
  })

  it('applyScene leaves fields it does not mention', () => {
    useSandbox.getState().setExplode(0.4)
    useSandbox.getState().applyScene({ slice: 0.2 })
    expect(useSandbox.getState().explode).toBe(0.4)
  })
})

describe('parseSandboxQuery', () => {
  it('reads known products, axis and clamped sliders', () => {
    expect(parseSandboxQuery('?product=QQQ&axis=y&slice=0.5&explode=3', known)).toEqual({
      productId: 'QQQ', sliceAxis: 'y', slice: 0.5, explode: 1,
    })
  })

  it('ignores unknown products, bad axes and non-numbers', () => {
    expect(parseSandboxQuery('?product=NOPE&axis=w&slice=abc', known)).toEqual({})
    expect(parseSandboxQuery('', known)).toEqual({})
  })

  it('accepts the diagonal axis', () => {
    expect(parseSandboxQuery('?axis=d', known)).toEqual({ sliceAxis: 'd' })
  })
})
