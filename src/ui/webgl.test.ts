import { describe, it, expect } from 'vitest'
import { hasWebGL } from './webgl'

const canvas = (ok: string[]) => () => ({ getContext: (id: string) => (ok.includes(id) ? {} : null) })

describe('hasWebGL', () => {
  it('accepts webgl2 or webgl', () => {
    expect(hasWebGL(canvas(['webgl2']))).toBe(true)
    expect(hasWebGL(canvas(['webgl']))).toBe(true)
  })

  it('rejects when neither context exists or creation throws', () => {
    expect(hasWebGL(canvas([]))).toBe(false)
    expect(
      hasWebGL(() => {
        throw new Error('no canvas')
      }),
    ).toBe(false)
  })
})
