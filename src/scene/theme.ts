export type ThemeId = 'dusk' | 'day'
type V3 = [number, number, number]
type LightSpec = { color: string; intensity: number; position: V3 }

export type Theme = {
  sky: string
  fog: { color: string; near: number; far: number }
  hemi: { sky: string; ground: string; intensity: number }
  key: LightSpec
  fill: LightSpec
  envIntensity: number
  sea: string
  island: { TW: string; US: string }
  pedestal: string
  plaza: string
  soil: string
  rod: string
  unclassified: string
  calloutLine: string
  /** 低飽和方塊：飽和度乘數、亮度位移；鮮豔方塊：亮度乘數 */
  tone: { mutedSaturation: number; mutedLightness: number; vividBoost: number }
}

export const THEMES: Record<ThemeId, Theme> = {
  dusk: {
    sky: '#1b1726',
    fog: { color: '#1e2838', near: 110, far: 320 }, // 偏藍、較晚開始：遠處海面仍讀得出是水
    hemi: { sky: '#8a7fb0', ground: '#2b2028', intensity: 0.55 },
    key: { color: '#ffcf9a', intensity: 1.9, position: [25, 22, 18] },
    fill: { color: '#7fa6d8', intensity: 0.5, position: [-20, 15, -10] },
    envIntensity: 0.2,
    sea: '#1f3a56',
    island: { TW: '#4a5a48', US: '#5a5040' },
    pedestal: '#3c4252',
    plaza: '#363b4a', // 冷灰藍：暖色主光下不會變成泥褐色
    soil: '#5d4037',
    rod: '#78909c',
    unclassified: '#8d8a93',
    calloutLine: '#e8e1d6',
    tone: { mutedSaturation: 0.55, mutedLightness: -0.09, vividBoost: 1.15 },
  },
  day: {
    sky: '#cfe8ff',
    fog: { color: '#dbeafe', near: 140, far: 420 },
    hemi: { sky: '#ffffff', ground: '#b0c4de', intensity: 0.8 },
    key: { color: '#ffffff', intensity: 1.6, position: [20, 30, 15] },
    fill: { color: '#dbe7ff', intensity: 0.4, position: [-20, 15, -10] },
    envIntensity: 0.25,
    sea: '#6fb4e8',
    island: { TW: '#a5d6a7', US: '#e6d3a3' },
    pedestal: '#e9e4d8',
    plaza: '#f3efe6',
    soil: '#5d4037',
    rod: '#78909c',
    unclassified: '#cfd8dc',
    calloutLine: '#1f2933',
    tone: { mutedSaturation: 0.55, mutedLightness: 0.06, vividBoost: 1 },
  },
}
