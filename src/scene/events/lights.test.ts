import { describe, expect, it } from 'vitest'
import lighting from '../Lighting.tsx?raw'

/**
 * 事件元件不自己掛燈：three.js 的燈數一變，所有受光材質都要重新編譯（Plan 7 review）。
 * 天光、平行光由 Lighting 一直掛著（eventLights.ts），事件只改顏色與強度。
 */
const SOURCES = import.meta.glob<string>('./*.tsx', { query: '?raw', import: 'default', eager: true })

describe('events never mount their own lights', () => {
  // ambientLight（閃電的閃光）不算：three.js 把所有環境光加成一個 uniform，著色器的程式鍵沒有環境光的數量，不會重新編譯
  it('no hemisphere, directional, point, spot or rect-area light in any event component', () => {
    const files = Object.entries(SOURCES)
    expect(files.length).toBeGreaterThan(5)
    for (const [f, src] of files) expect(src.match(/<(hemisphere|directional|point|spot|rectArea)Light\b/g), f).toBeNull()
  })
  it('Lighting mounts the shared event lights', () => {
    expect(lighting).toContain('eventLights.hemi = h')
    expect(lighting).toContain('eventLights.key = k')
  })
})
