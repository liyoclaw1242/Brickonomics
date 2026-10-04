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
    fog: { color: '#2a2230', near: 70, far: 220 },
    hemi: { sky: '#8a7fb0', ground: '#2b2028', intensity: 0.55 },
    key: { color: '#ffcf9a', intensity: 1.9, position: [25, 22, 18] },
    fill: { color: '#7fa6d8', intensity: 0.5, position: [-20, 15, -10] },
    envIntensity: 0.2,
    sea: '#1f2c3d',
    island: { TW: '#4a5a48', US: '#5a5040' },
    pedestal: '#3b3540',
    plaza: '#3a3440',
    soil: '#5d4037',
    rod: '#78909c',
    unclassified: '#8d8a93',
    calloutLine: '#e8e1d6',
    tone: { mutedSaturation: 0.45, mutedLightness: -0.06, vividBoost: 1.08 },
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
    tone: { mutedSaturation: 0.6, mutedLightness: 0.04, vividBoost: 1 },
  },
}
