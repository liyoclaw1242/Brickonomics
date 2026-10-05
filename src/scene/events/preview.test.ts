import { describe, expect, it } from 'vitest'
import { EVENT_KINDS } from './index'
import { PREVIEW_SPECS, numParam, parsePreview } from './preview'

describe('event preview query', () => {
  it('is off without ?eventPreview or with an unknown kind', () => {
    expect(parsePreview('')).toBeNull()
    expect(parsePreview('?course=beginner')).toBeNull()
    expect(parsePreview('?eventPreview=volcano')).toBeNull()
    expect(parsePreview('?eventPreview=toString')).toBeNull()
  })

  it('every event kind can be previewed', () => {
    expect(Object.keys(PREVIEW_SPECS).sort()).toEqual([...EVENT_KINDS].sort())
    for (const k of EVENT_KINDS) expect(parsePreview(`?eventPreview=${k}`)?.spec.kind).toBe(k)
  })

  it('t: absent = play, number = freeze there, end = the final state', () => {
    expect(parsePreview('?eventPreview=tornado')?.t).toBeNull()
    expect(parsePreview('?eventPreview=tornado&t=1.5')?.t).toBe(1.5)
    expect(parsePreview('?eventPreview=tornado&t=end')?.t).toBe(Infinity)
    expect(parsePreview('?eventPreview=tornado&t=-3')?.t).toBe(0)
  })

  it('reduced=1 simulates prefers-reduced-motion', () => {
    expect(parsePreview('?eventPreview=tornado')?.reduced).toBe(false)
    expect(parsePreview('?eventPreview=tornado&reduced=1')?.reduced).toBe(true)
  })

  it('lightning phase', () => {
    expect(parsePreview('?eventPreview=lightning')?.spec).toEqual({ kind: 'lightning', phase: 'strike' })
    expect(parsePreview('?eventPreview=lightning&phase=gather')?.spec).toEqual({ kind: 'lightning', phase: 'gather' })
  })

  it('quake depth', () => {
    expect(parsePreview('?eventPreview=quake')?.spec).toMatchObject({ kind: 'quake', depth: 0.4 })
    expect(parsePreview('?eventPreview=quake&depth=0.8')?.spec).toMatchObject({ kind: 'quake', depth: 0.8 })
    expect(parsePreview('?eventPreview=quake&depth=3')?.spec).toMatchObject({ kind: 'quake', depth: 1 })
  })

  it('bubble phase and lift', () => {
    expect(parsePreview('?eventPreview=bubble')?.spec).toMatchObject({ kind: 'bubble', phase: 'float' })
    expect(parsePreview('?eventPreview=bubble&phase=pop')?.spec).toMatchObject({ kind: 'bubble', phase: 'pop' })
    expect(parsePreview('?eventPreview=bubble')?.spec).not.toHaveProperty('lift')
    expect(parsePreview('?eventPreview=bubble&lift=5')?.spec).toMatchObject({ lift: 5 })
  })

  it('freeze amount', () => {
    expect(parsePreview('?eventPreview=freeze')?.spec).toMatchObject({ kind: 'freeze', amount: 0.9 })
    expect(parsePreview('?eventPreview=freeze&amount=0.3')?.spec).toMatchObject({ kind: 'freeze', amount: 0.3 })
  })

  it('sunnyTree warmth', () => {
    expect(parsePreview('?eventPreview=sunnyTree')?.spec).toEqual({ kind: 'sunnyTree', warmth: 1 })
    expect(parsePreview('?eventPreview=sunnyTree&warmth=0.4')?.spec).toEqual({ kind: 'sunnyTree', warmth: 0.4 })
  })

  it('numParam clamps and falls back', () => {
    const q = new URLSearchParams('a=2&b=x&c=-1&d=')
    expect(numParam(q, 'a', 0.5, 0, 1)).toBe(1)
    expect(numParam(q, 'b', 0.5, 0, 1)).toBe(0.5)
    expect(numParam(q, 'c', 0.5, 0, 1)).toBe(0)
    expect(numParam(q, 'd', 0.5, 0, 1)).toBe(0.5)
    expect(numParam(q, 'zz', 0.5, 0, 1)).toBe(0.5)
  })
})
