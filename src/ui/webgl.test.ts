import { describe, it, expect, vi } from 'vitest'
import { hasWebGL } from './webgl'

const canvas = (ok: string[]) => () => ({ getContext: (id: string) => (ok.includes(id) ? {} : null) })

describe('hasWebGL', () => {
  it('releases the probe context', () => {
    const loseContext = vi.fn()
    const gl = { getExtension: (n: string) => (n === 'WEBGL_lose_context' ? { loseContext } : null) }
    expect(hasWebGL(() => ({ getContext: () => gl }))).toBe(true)
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  it('still reports true when the context has no getExtension', () => {
    expect(hasWebGL(canvas(['webgl']))).toBe(true)
  })

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
