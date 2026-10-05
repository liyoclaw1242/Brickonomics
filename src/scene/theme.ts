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
  /** b-3 經濟風暴的龍捲風：漏斗（灰藍）、捲起的塵、頂上的烏雲、雨絲 */
  storm: { funnel: string; dust: string; cloud: string; streak: string }
  /** c-2 閃電：白色芯、外圈光暈；flash＝打中那一刻全場補光的最大強度（只一次、很輕） */
  bolt: { core: string; glow: string; flash: number }
  /** 🌋 地震：坑壁、坑底、地面裂痕、塵土、坑邊翹起的地磚 */
  quake: { wall: string; floor: string; crack: string; dust: string; rim: string }
  /** 🫧 泡泡：膜邊緣的兩個顏色（像肥皂泡的彩虹）、亮點、破掉的水滴、浮起時地上的影子 */
  bubble: { rimA: string; rimB: string; highlight: string; drop: string; shadow: string }
  /** ❄️ 寒流：冰殼與冰柱、積雪與雪花、風絲、冷色天光（顏色與最大強度） */
  frost: { ice: string; snow: string; wind: string; chill: string; chillIntensity: number }
  /**
   * 🌤 晴天：放晴後的天空與霧、太陽、散開的雲、暖光（顏色、主光與天光的最大強度、地面反光色）、樹冠的兩種綠
   */
  sunny: {
    sky: string
    fog: string
    sun: string
    /** 光暈與光芒的顏色、強度；glowAdditive＝用加法混色（暗底上才會發光，亮底上會洗白） */
    glow: string
    glowOpacity: number
    glowAdditive: boolean
    cloud: string
    lightColor: string
    light: number
    ambient: number
    ground: string
    leaf: string
    leafDark: string
  }
  /** ☀️ 熱浪：變熱後的天空與霧、烈日（圓盤、光暈）、熱氣線、橘色天光（顏色、最大強度、地面反光色） */
  heat: {
    sky: string
    fog: string
    sun: string
    glow: string
    glowOpacity: number
    glowAdditive: boolean
    shimmer: string
    /** 舞台後面那片暖色霧的顏色與最大不透明度 */
    haze: string
    hazeOpacity: number
    light: string
    ambient: number
    ground: string
  }
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
    // 暗底上要讀得出來：漏斗用偏亮的灰藍，烏雲比天空亮一階
    storm: { funnel: '#9aabc4', dust: '#c3cedd', cloud: '#5a6378', streak: '#a9b8cc' },
    bolt: { core: '#ffffff', glow: '#8fd3ff', flash: 0.45 },
    // 暗廣場上：坑壁用暖褐（比廣場亮、讀得出是土），坑底更暗；翹起的地磚比廣場亮一階
    quake: { wall: '#7a5442', floor: '#24181a', crack: '#0d0a10', dust: '#a89a8e', rim: '#4b5164' },
    bubble: { rimA: '#9fe7ff', rimB: '#f3b4ff', highlight: '#ffffff', drop: '#cdefff', shadow: '#05060c' },
    frost: { ice: '#9fdcff', snow: '#eef8ff', wind: '#cfe9ff', chill: '#8fc8ff', chillIntensity: 0.45 },
    // 黃昏的「放晴」：天空從深紫往暖一點、亮一點的紫橘；太陽是低低的金色
    sunny: {
      sky: '#6a4a62',
      fog: '#4f3e56',
      sun: '#ffd27a',
      glow: '#ffc46b',
      glowOpacity: 0.7,
      glowAdditive: true,
      cloud: '#9a98b0',
      lightColor: '#ffc27a',
      light: 1.2,
      ambient: 0.55,
      ground: '#3a2a20',
      leaf: '#5fbf5a',
      leafDark: '#3f9a48',
    },
    // 黃昏的熱浪：天空與霧往暗橘紅混，烈日偏白、光暈橘紅
    heat: {
      sky: '#5a2a26',
      fog: '#4a2a28',
      sun: '#fff1c8',
      glow: '#ff7a3d',
      glowOpacity: 0.8,
      glowAdditive: true,
      shimmer: '#ffb27a',
      haze: '#ff7a45',
      hazeOpacity: 0.45,
      light: '#ff9a52',
      ambient: 0.6,
      ground: '#4a2418',
    },
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
    // 亮底上：漏斗用深灰藍，烏雲接近石板色
    storm: { funnel: '#56657d', dust: '#7b889b', cloud: '#3a4252', streak: '#6b7a90' },
    // 亮底上白色會不見：芯用淡黃白，外圈用深一點的電紫藍勾邊
    bolt: { core: '#fffbe0', glow: '#5b4bff', flash: 0.35 },
    // 亮廣場上：坑壁中褐、坑底深褐，裂痕深咖啡；地磚比廣場暗一階才分得出來
    quake: { wall: '#9a7058', floor: '#4a3128', crack: '#3e2723', dust: '#c9b8aa', rim: '#ddd6c6' },
    // 亮底上：膜邊緣要深一點才看得到
    bubble: { rimA: '#2f8fd0', rimB: '#b05ad8', highlight: '#ffffff', drop: '#4aa6e0', shadow: '#4a5568' },
    // 亮底上：風絲用深一點的灰藍才看得到
    frost: { ice: '#8fd3f7', snow: '#ffffff', wind: '#5f8fb5', chill: '#a9d8ff', chillIntensity: 0.35 },
    // 白天：天空更亮更暖；雲用淺灰（亮底上才看得到）
    sunny: {
      sky: '#fff1d6',
      fog: '#fbefd9',
      sun: '#ffcc33',
      glow: '#ffd54f',
      glowOpacity: 0.75,
      glowAdditive: false,
      cloud: '#b8c2cf',
      lightColor: '#ffe2a8',
      light: 0.8,
      ambient: 0.35,
      ground: '#c9b48a',
      leaf: '#66bb6a',
      leafDark: '#43a047',
    },
    // 白天的熱浪：天空往淡橘黃混；熱氣線用深一點的橘（亮底上才看得到）
    heat: {
      sky: '#ffd9a8',
      fog: '#ffe2bf',
      sun: '#fff6d8',
      glow: '#ff9a3d',
      glowOpacity: 0.7,
      glowAdditive: false,
      shimmer: '#e8762e',
      haze: '#ffb36b',
      hazeOpacity: 0.55,
      light: '#ffb070',
      ambient: 0.45,
      ground: '#d9a070',
    },
    tone: { mutedSaturation: 0.55, mutedLightness: 0.06, vividBoost: 1 },
  },
}
