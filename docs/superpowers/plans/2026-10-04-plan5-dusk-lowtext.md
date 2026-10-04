# 積木城市 Plan 5：黃昏風格與少字教學 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把畫面改成接近參考圖的深色黃昏風格（可切白天），版面改為深色玻璃面板＋右上工具列＋底部章節時間軸＋帶引線標註，並把每一步改成「短標題＋一句話＋大數字＋多說一點」的少字聯想教法；移除免責聲明。

**Architecture:** 先抽出主題（純 `theme.ts`＋`store/theme.ts`＋CSS 變數）與燈光，再加方塊色調規則（純 `tone.ts`）、標註元件（`Callout`／`NameLabel`）、版面模型（純 `layoutModel.ts`），接著擴充課程資料模型並改寫全部步驟，最後拆面板、加時間軸與工具列、接上焦點與標註、更新 e2e 與走查。每一步都有單元測試或截圖驗證。

**Tech Stack:** 沿用 Plan 1–4（Vite、React 19、R3F 9、drei 10、zustand 5、zod 4、Vitest、Playwright）。

**規格：** `docs/superpowers/specs/2026-10-04-plan5-dusk-lowtext-design.md`
**必讀：** `docs/superpowers/plans/plan3-carryover.md` 最後一段（Plan 5 事項）

## Global Constraints

- 介面外框文字只在 `src/ui/strings.ts`；課程內容（標題、一句話、多說一點、標註文字）只在 `src/tour/levels.ts`。
- **移除免責聲明**；介面不可出現「稅」。
- 標示一律用圖示（`MarkIcon`）：≈ 示意、✎ 假設、？ 待驗證；判斷規則不變（示意舞台必標 ≈、前收手續費標 ✎、未驗證用 `isVerified` 標 ？）。
- 每一步：`title` ≤ 8 字、`line` ≤ 20 字（不含 `**`），最多 2 個 `callouts`；數字一律由 `TextContext` 即時計算。
- 預設主題黃昏，可切白天；選擇存 localStorage（失敗時靜默）。
- 方塊：城市與籃子預設低飽和（muted），焦點／選取／拆開時鮮豔（vivid）；方塊數嚴格依權重；一種材質一個 InstancedMesh。
- 純 TypeScript 模組清單加上：`src/scene/theme.ts`、`src/scene/layout/tone.ts`、`src/ui/layoutModel.ts`、`src/ui/emphasis.ts`、`src/ui/chapters.ts`。
- 新增 drei `<Html>` 等 `useAfterFirstTick()`；所有 3D 文字標籤改經 `Callout`／`NameLabel`。
- 3b1b 教法（規格 §2.2）：關鍵詞與物體同色（`**詞|顏色鍵**`）；鏡頭停下後才淡入文字與轉換色調；大數字數上來；`prefers-reduced-motion` 時不做動畫。
- 寫作規則（規格 §2.1，參考 ASD-STE100）：一詞一義、一句一事、操作句動作詞開頭、不用「被」。
- TypeScript strict，不可以使用 `any`。
- 共用工作規則：`.superpowers/sdd/p4-common.md`（dev server 只用 node PID 關閉、不碰 5173、截圖要 Read、commit 附 Co-Authored-By）。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `src/scene/theme.ts` | 兩套主題的顏色與燈光參數（純） |
| `src/store/theme.ts` | 主題／標註／圖例開關，localStorage |
| `src/scene/Lighting.tsx` | 依主題設定天空、霧、燈光、環境光 |
| `src/scene/layout/tone.ts` | 方塊色調規則與轉色（純） |
| `src/scene/Callout.tsx`、`src/scene/NameLabel.tsx` | 帶引線標註、淡色名稱字 |
| `src/ui/MarkIcon.tsx` | ≈ ✎ ？ 小圖示與點擊說明 |
| `src/ui/emphasis.ts` | `**關鍵詞**` 解析與字數（純） |
| `src/ui/layoutModel.ts` | 版面佔用邊距（純） |
| `src/ui/chapters.ts` | 章節時間軸狀態（純） |
| `src/ui/panel/*.tsx` | `StepHeader`、`OneLine`、`BigNumberCard`、`MoreSection`、`StepNav` |
| `src/ui/Toolbar.tsx`、`src/ui/ChapterTimeline.tsx`、`src/ui/Legend.tsx` | 右上工具列、底部時間軸、圖例 |
| `src/tour/types.ts`、`src/tour/engine.ts`、`src/tour/context.ts`、`src/tour/levels.ts`（改） | 課程資料模型與改寫 |
| `src/ui/ui.css`（改） | 黃昏／白天 CSS 變數與新元件樣式 |
| 移除：`src/ui/Disclaimer.tsx`、`src/scene/labelStyle.ts` | |

---

### Task 1：主題設定、主題 store、移除免責聲明

**Files:**
- Create: `src/scene/theme.ts`, `src/scene/theme.test.ts`, `src/store/theme.ts`, `src/store/theme.test.ts`
- Modify: `src/main.tsx`, `src/App.tsx`, `src/ui/FallbackApp.tsx`, `src/ui/strings.ts`, `src/ui/ui.css`
- Delete: `src/ui/Disclaimer.tsx`

**Interfaces:**
- Produces:
  - `type ThemeId = 'dusk' | 'day'`；`type Theme`（見程式碼）；`THEMES: Record<ThemeId, Theme>`
  - `useThemeStore`：`theme: ThemeId`、`labels: boolean`、`legend: boolean`；`toggleTheme()`、`setTheme(id)`、`toggleLabels()`、`toggleLegend()`；`parseThemeParam(search): ThemeId | null`
  - `document.documentElement.dataset.theme` 隨主題同步

- [ ] **Step 1：撰寫失敗的測試**

`src/scene/theme.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { THEMES } from './theme'

describe('THEMES', () => {
  it('defines the same keys for dusk and day', () => {
    expect(Object.keys(THEMES.dusk).sort()).toEqual(Object.keys(THEMES.day).sort())
  })
  it('makes dusk darker than day', () => {
    expect(THEMES.dusk.sky).not.toBe(THEMES.day.sky)
    expect(THEMES.dusk.key.intensity).toBeGreaterThan(0)
  })
})
```
`src/store/theme.test.ts`：
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, parseThemeParam } from './theme'

beforeEach(() => useThemeStore.setState(useThemeStore.getInitialState()))

describe('useThemeStore', () => {
  it('defaults to dusk with labels on and legend off', () => {
    expect(useThemeStore.getState()).toMatchObject({ theme: 'dusk', labels: true, legend: false })
  })
  it('toggles theme, labels and legend', () => {
    const s = useThemeStore.getState()
    s.toggleTheme()
    s.toggleLabels()
    s.toggleLegend()
    expect(useThemeStore.getState()).toMatchObject({ theme: 'day', labels: false, legend: true })
  })
})

describe('parseThemeParam', () => {
  it('reads ?theme=day|dusk and ignores others', () => {
    expect(parseThemeParam('?theme=day')).toBe('day')
    expect(parseThemeParam('?theme=dusk')).toBe('dusk')
    expect(parseThemeParam('?theme=x')).toBeNull()
    expect(parseThemeParam('')).toBeNull()
  })
})
```

- [ ] **Step 2：確認失敗後實作 `src/scene/theme.ts`**

```ts
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
```

- [ ] **Step 3：實作 `src/store/theme.ts`**

```ts
import { create } from 'zustand'
import type { ThemeId } from '../scene/theme'

const KEY = 'block-city-invest:theme'

export function parseThemeParam(search: string): ThemeId | null {
  const t = new URLSearchParams(search).get('theme')
  return t === 'day' || t === 'dusk' ? t : null
}

function loadTheme(): ThemeId {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'day' ? 'day' : 'dusk'
  } catch {
    return 'dusk'
  }
}

function saveTheme(t: ThemeId) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // 只是方便功能
  }
}

type ThemeState = {
  theme: ThemeId
  labels: boolean
  legend: boolean
  setTheme: (t: ThemeId) => void
  toggleTheme: () => void
  toggleLabels: () => void
  toggleLegend: () => void
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: 'dusk',
  labels: true,
  legend: false,
  setTheme: (t) => {
    saveTheme(t)
    set({ theme: t })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dusk' ? 'day' : 'dusk'),
  toggleLabels: () => set({ labels: !get().labels }),
  toggleLegend: () => set({ legend: !get().legend }),
}))

export { loadTheme }
```

- [ ] **Step 4：同步到 DOM、移除免責聲明**

- `main.tsx`（WebGL 與 fallback 兩條路都要）：`useThemeStore.getState().setTheme(parseThemeParam(location.search) ?? loadTheme())`，並訂閱 store：`useThemeStore.subscribe((s) => (document.documentElement.dataset.theme = s.theme))`，初始也設一次。
- 刪除 `src/ui/Disclaimer.tsx` 與所有引用（`App.tsx`、`FallbackApp.tsx`），刪除 `T.disclaimer`，刪除 `.disclaimer` CSS。
- `ui.css`：把現有 `:root` 變數改成兩組：`:root[data-theme='dusk']`（新的深色變數）與 `:root[data-theme='day']`（沿用現有淺色變數），移除 `prefers-color-scheme` 區塊。黃昏變數：
```css
:root[data-theme='dusk'] {
  --bg: #1b1726;
  --surface: rgba(28, 24, 36, 0.78);
  --surface-strong: rgba(20, 17, 28, 0.9);
  --text: #f3ebe0;
  --muted: #a99e93;
  --accent: #e9b97a;
  --accent-text: #241c18;
  --chip: rgba(255, 255, 255, 0.06);
  --chip-on: #e9b97a;
  --chip-on-text: #241c18;
  --border: rgba(255, 255, 255, 0.12);
  --badge: #8fb8c8;
  --em: #e9b97a;
}
```
白天變數沿用現有淺色值，另加 `--surface-strong: rgba(255,255,255,0.95); --accent-text: #ffffff; --em: #c2410c;`。

- [ ] **Step 5：測試、建置、截圖**

`npx tsc --noEmit && npm test && npm run build`。截圖 `/?mode=sandbox&quality=high`（黃昏）與 `/?mode=sandbox&quality=high&theme=day`，Read：免責聲明消失、面板是深色（黃昏）與淺色（白天）。

- [ ] **Step 6：Commit**

```bash
git add -A src
git commit -m "feat(theme): dusk/day theme tokens and store; remove disclaimer"
```

---

### Task 2：燈光與場景顏色跟著主題

**Files:**
- Create: `src/scene/Lighting.tsx`
- Modify: `src/scene/Scene.tsx`, `src/scene/City.tsx`, `src/scene/stage/Plaza.tsx`, `src/scene/stage/UndergroundStage.tsx`, `src/scene/stage/Excavator.tsx`，以及其他寫死場景色的元件（`grep -rn "'#[0-9a-fA-F]\{6\}'" src/scene`）

**Interfaces:**
- Consumes: `THEMES`、`useThemeStore`
- Produces: `Lighting()`（背景色、霧、半球光、主光含陰影、補光、Environment）；場景元件以 `THEMES[theme]` 取色

- [ ] **Step 1：建立 `src/scene/Lighting.tsx`**

```tsx
import { Environment, Lightformer } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import { QUALITY, type Quality } from './quality'
import { THEMES } from './theme'

export function Lighting({ quality }: { quality: Quality }) {
  const t = THEMES[useThemeStore((s) => s.theme)]
  return (
    <>
      <color attach="background" args={[t.sky]} />
      <fog attach="fog" args={[t.fog.color, t.fog.near, t.fog.far]} />
      <hemisphereLight args={[t.hemi.sky, t.hemi.ground, t.hemi.intensity]} />
      <directionalLight
        color={t.key.color}
        position={t.key.position}
        intensity={t.key.intensity}
        castShadow={QUALITY[quality].shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight color={t.fill.color} position={t.fill.position} intensity={t.fill.intensity} />
      <Environment resolution={64} frames={1} environmentIntensity={t.envIntensity}>
        <Lightformer form="rect" intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[12, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[12, 8, 1]} />
      </Environment>
    </>
  )
}
```
（主題切換會改燈光與背景：在主題改變的 effect 裡呼叫 `invalidate()`，demand 模式才會重繪。）

- [ ] **Step 2：Scene 與各元件改用主題色**

- `Scene.tsx`：刪除原本的 `<color>`、燈光、`<Environment>`，改放 `<Lighting quality={quality} />`；海面用 `t.sea`；櫃台用 `t.pedestal`。
- `City.tsx`：島用 `t.island[region]`。
- `Plaza.tsx`：`t.plaza`。
- `UndergroundStage.tsx`：`SOIL`、`UNCLASSIFIED`、`ROD` 改讀 `t.soil`、`t.unclassified`、`t.rod`。
- 其他寫死的環境色（不含產業色、債券材質色、金幣色、紅色損失堆這些「有意義的顏色」）都改讀主題。在報告列出逐一判斷。

- [ ] **Step 3：測試、建置、截圖**

`npx tsc --noEmit && npm test && npm run build`。截圖 `/?level=0&step=0&quality=high`、`/?level=6&step=0&quality=high`、各加 `&theme=day`，Read：黃昏是深紫藍天空＋暖光、白天接近原樣；切換不會留下前一主題的顏色。

- [ ] **Step 4：Commit**

```bash
git add -A src
git commit -m "feat(theme): lighting rig and scene colours follow the theme"
```

---

### Task 3：方塊色調（低飽和／鮮豔）

**Files:**
- Create: `src/scene/layout/tone.ts`, `src/scene/layout/tone.test.ts`
- Modify: `src/scene/VoxelInstances.tsx`, `src/scene/Basket.tsx`, `src/scene/BasketView.tsx`, `src/scene/City.tsx`

**Interfaces:**
- Consumes: `THEMES`、`Theme`
- Produces:
  - `type Tone = 'vivid' | 'muted'`
  - `groupTone(p: { group: number; focus: readonly number[]; picked: number | null; explode: number }): Tone`
  - `toneColor(hex: string, tone: Tone, theme: Theme): string`
  - `VoxelInstances` 改用 `focusGroups: number[]` 與 `picked: number | null`（取代 `highlightGroup` 的變暗規則）

規則：拆開程度 > 0.3 → 全部鮮豔；有選取 → 被選的鮮豔、其他低飽和；有焦點 → 焦點鮮豔、其他低飽和；都沒有 → 全部低飽和。

- [ ] **Step 1：撰寫失敗的測試 `tone.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { THEMES } from '../theme'
import { groupTone, toneColor } from './tone'

const base = { focus: [] as number[], picked: null, explode: 0 }

describe('groupTone', () => {
  it('is muted by default and vivid when exploded', () => {
    expect(groupTone({ ...base, group: 0 })).toBe('muted')
    expect(groupTone({ ...base, group: 0, explode: 0.5 })).toBe('vivid')
  })
  it('highlights the picked group over focus', () => {
    expect(groupTone({ ...base, group: 1, picked: 1, focus: [0] })).toBe('vivid')
    expect(groupTone({ ...base, group: 0, picked: 1, focus: [0] })).toBe('muted')
  })
  it('highlights focus groups when nothing is picked', () => {
    expect(groupTone({ ...base, group: 2, focus: [2] })).toBe('vivid')
    expect(groupTone({ ...base, group: 3, focus: [2] })).toBe('muted')
  })
})

describe('toneColor', () => {
  it('lowers saturation for muted', () => {
    const hsl = { h: 0, s: 0, l: 0 }
    const before = new Color('#4f7cff').getHSL({ ...hsl }).s
    const after = new Color(toneColor('#4f7cff', 'muted', THEMES.dusk)).getHSL({ ...hsl }).s
    expect(after).toBeLessThan(before)
  })
  it('keeps vivid colours unchanged on day (boost 1)', () => {
    expect(toneColor('#4f7cff', 'vivid', THEMES.day)).toBe('#4f7cff')
  })
})
```

- [ ] **Step 2：確認失敗後實作 `tone.ts`**

```ts
import { Color } from 'three'
import type { Theme } from '../theme'

export type Tone = 'vivid' | 'muted'

export function groupTone(p: { group: number; focus: readonly number[]; picked: number | null; explode: number }): Tone {
  if (p.explode > 0.3) return 'vivid'
  if (p.picked !== null) return p.group === p.picked ? 'vivid' : 'muted'
  if (p.focus.length > 0) return p.focus.includes(p.group) ? 'vivid' : 'muted'
  return 'muted'
}

export function toneColor(hex: string, tone: Tone, theme: Theme): string {
  const c = new Color(hex)
  if (tone === 'vivid') {
    if (theme.tone.vividBoost === 1) return hex
    c.multiplyScalar(theme.tone.vividBoost)
    return `#${c.getHexString()}`
  }
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s * theme.tone.mutedSaturation, Math.min(1, Math.max(0, hsl.l + theme.tone.mutedLightness)))
  return `#${c.getHexString()}`
}
```

- [ ] **Step 3：套用**

- `VoxelInstances`：props 改為 `focusGroups?: number[]`（預設 `[]`）、`picked: number | null`；顏色 effect 用 `toneColor(looks[g].color, groupTone({ group: g, focus, picked, explode }), THEMES[theme])`（damaged 仍混紅色）；依賴加入 `theme`、`explode` 是否越過 0.3 的布林值（避免每幀重算）；改完呼叫 `invalidate()`。
- `Basket`：`highlightId` → 轉成 `picked` 索引；新增 prop `focusIds?: string[]` 轉成 `focusGroups`。
- `BasketView`：從目前步驟取 `focus.holdings`（Task 5 才加；本任務先傳 `[]`）。
- `City`：大樓顏色用 `toneColor(lookFor(asset).color, picked === id ? 'vivid' : 'muted', theme)`。

- [ ] **Step 3b：色調漸變（3b1b：一次只變一件事）**

- 在 `tone.ts` 加入純函式並測試：
```ts
export const TONE_FADE_SEC = 0.4
/** 0→1 的漸變進度，smoothstep。 */
export function toneProgress(elapsedSec: number): number {
  const t = Math.min(1, Math.max(0, elapsedSec / TONE_FADE_SEC))
  return t * t * (3 - 2 * t)
}
```
測試：`toneProgress(0) === 0`、`toneProgress(0.2) === 0.5`、`toneProgress(1) === 1`。
- `VoxelInstances`：目標顏色改變時，記下每個 instance 的起始色，用 `useContinuousRender` 在約 400ms 內 `lerpColors(from, to, toneProgress(t))`，結束後停止連續渲染。導覽模式下，色調轉換等到 `document.body.dataset.cameraSettled === 'true'` 才開始（在 useFrame 內檢查）。`matchMedia('(prefers-reduced-motion: reduce)').matches` 時直接套用目標色。

- [ ] **Step 4：測試、截圖、Commit**

`npx tsc --noEmit && npm test && npm run build`；截圖 `/?mode=sandbox&quality=high`（全部低飽和）、點一層後（scratch 腳本）被選的鮮豔、`&explode=1` 全部鮮豔；Read 描述。

```bash
git add -A src
git commit -m "feat(scene): muted architectural blocks with vivid focus/pick/explode"
```

---

### Task 4：標註元件與標示圖示

**Files:**
- Create: `src/scene/Callout.tsx`, `src/scene/NameLabel.tsx`, `src/ui/MarkIcon.tsx`
- Modify: 所有使用 `<Html>` 的元件（`City.tsx` 與 `src/scene/stage/*.tsx`）、`src/ui/strings.ts`、`src/ui/ui.css`、`src/ui/readout.ts`（標示改成 `mark` 欄位）、`src/ui/StageControls.tsx`、`src/ui/PickInfoPanel.tsx`
- Delete: `src/scene/labelStyle.ts`

**Interfaces:**
- Produces:
  - `type Mark = 'illustrative' | 'assumption' | 'unverified'`（放在 `src/ui/strings.ts` 旁的 `src/ui/marks.ts`，純）
  - `MarkIcon({ kind }: { kind: Mark })`：顯示 `T.marks[kind].icon`，`role="img"`、`aria-label` 與 `title` 為說明；點擊切換說明氣泡
  - `Callout({ anchor, offset = [0, 2, 0], title, sub, mark, dim }: { anchor: Vec3; offset?: Vec3; title: string; sub?: string; mark?: Mark; dim?: boolean })`：錨點小圓點＋細引線（drei `<Line>`，`theme.calloutLine`）＋ `<Html>` 標註（`useAfterFirstTick` 後才掛）；`offset` 為 `[0,0,0]` 時不畫引線；`useThemeStore().labels` 為 false 時整個不顯示
  - `NameLabel({ position, text, active })`：淡色名稱字，`active` 時變亮；受 `labels` 開關控制
  - `ReadoutRow` 新增 `mark?: Mark`（取代 `unverified` 布林；`note` 保留）

- [ ] **Step 1：strings 與 marks**

`src/ui/marks.ts`：
```ts
export type Mark = 'illustrative' | 'assumption' | 'unverified'
```
`T` 加入：
```ts
  marks: {
    illustrative: { icon: '≈', label: '示意：為了說明而設計，不是真實數字' },
    assumption: { icon: '✎', label: '假設值：可以自己調整' },
    unverified: { icon: '？', label: '待驗證：這筆資料還沒查證' },
  },
```
刪除 `T.stage.illustrativeTag`、`T.unverified`、`T.assumption`，以及各字串裡寫死的「（示意）」後綴（改由 `MarkIcon` 表示）。

- [ ] **Step 2：元件**

`src/ui/MarkIcon.tsx`：
```tsx
import { useState } from 'react'
import type { Mark } from './marks'
import { T } from './strings'

export function MarkIcon({ kind }: { kind: Mark }) {
  const [open, setOpen] = useState(false)
  const m = T.marks[kind]
  return (
    <span className={`mark mark--${kind}`}>
      <button type="button" className="mark__icon" aria-label={m.label} title={m.label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {m.icon}
      </button>
      {open && <span className="mark__tip" role="tooltip">{m.label}</span>}
    </span>
  )
}
```

`src/scene/Callout.tsx`：
```tsx
import { Html, Line } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import { MarkIcon } from '../ui/MarkIcon'
import type { Mark } from '../ui/marks'
import type { Vec3 } from './camera'
import { THEMES } from './theme'
import { useAfterFirstTick } from './useAfterFirstTick'

type Props = { anchor: Vec3; offset?: Vec3; title: string; sub?: string; mark?: Mark; dim?: boolean }

export function Callout({ anchor, offset = [0, 2, 0], title, sub, mark, dim = false }: Props) {
  const ready = useAfterFirstTick()
  const show = useThemeStore((s) => s.labels)
  const t = THEMES[useThemeStore((s) => s.theme)]
  if (!show) return null
  const end: Vec3 = [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]]
  const leader = offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0
  return (
    <group>
      {leader && (
        <>
          <mesh position={anchor}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color={t.calloutLine} />
          </mesh>
          <Line points={[anchor, end]} color={t.calloutLine} lineWidth={1} transparent opacity={dim ? 0.3 : 0.75} />
        </>
      )}
      {ready && (
        <Html position={end} center={!leader} className={dim ? 'callout callout--dim' : 'callout'}>
          <span className="callout__title">
            {title}
            {mark && <MarkIcon kind={mark} />}
          </span>
          {sub && <span className="callout__sub">{sub}</span>}
        </Html>
      )}
    </group>
  )
}
```
（`<Html>` 預設 `pointer-events` 由 CSS 控制：`.callout { pointer-events: none }`，但 `.mark__icon { pointer-events: auto }` 讓圖示可點。）

`src/scene/NameLabel.tsx`：
```tsx
import { Html } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import type { Vec3 } from './camera'
import { useAfterFirstTick } from './useAfterFirstTick'

export function NameLabel({ position, text, active = false }: { position: Vec3; text: string; active?: boolean }) {
  const ready = useAfterFirstTick()
  const show = useThemeStore((s) => s.labels)
  if (!ready || !show) return null
  return (
    <Html position={position} center className={active ? 'name-label name-label--active' : 'name-label'}>
      {text}
    </Html>
  )
}
```

CSS（`ui.css`）：
```css
.callout { pointer-events: none; display: grid; gap: 2px; padding: 6px 10px; border-radius: 8px; white-space: nowrap;
  background: var(--surface-strong); border: 1px solid var(--border); color: var(--text); font-size: 13px; transform: translate(8px, -50%); }
.callout--dim { opacity: 0.45; }
.callout__title { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
.callout__sub { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; }
.name-label { pointer-events: none; font-size: 11px; color: var(--muted); opacity: 0.7; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.name-label--active { opacity: 1; color: var(--text); font-weight: 600; }
.mark { position: relative; display: inline-flex; }
.mark__icon { pointer-events: auto; border: 1px solid var(--border); background: var(--chip); color: var(--badge);
  width: 18px; height: 18px; border-radius: 50%; font-size: 11px; line-height: 1; padding: 0; cursor: pointer; }
.mark__tip { position: absolute; top: 120%; left: 50%; transform: translateX(-50%); z-index: 10; width: max-content; max-width: 220px;
  padding: 6px 8px; border-radius: 8px; background: var(--surface-strong); border: 1px solid var(--border); font-size: 12px; white-space: normal; }
```

- [ ] **Step 3：遷移所有標籤**

- `City.tsx`：大樓名稱改 `NameLabel`（被選到的大樓 `active`）；島名改 `NameLabel`（較大字可用額外 class）。
- 舞台元件：有指向物體的標籤改 `Callout`（錨點＝物體頂端，`offset` 往上或往前），把原本的「（示意）」改成 `mark="illustrative"`；純說明型（計費表、成交價、細桿說明）改 `Callout` 並傳 `offset={[0,0,0]}`。
- `readout.ts`：`unverified: true` 改 `mark: 'unverified'`；前收列 `mark: 'assumption'`；示意的列 `mark: 'illustrative'`。更新 `readout.test.ts`。
- `StageControls`、`PickInfoPanel`、`TourPanel` 的「待驗證」「假設」文字徽章改 `MarkIcon`。
- 刪除 `src/scene/labelStyle.ts`。
- 工具列的「標註」開關在 Task 7 加入；本任務先確認 `labels=false` 時 `Callout`／`NameLabel` 都不顯示（開發模式下在 console 呼叫 `useThemeStore.getState().toggleLabels()` 截圖驗證）。

- [ ] **Step 4：測試、走查、Commit**

`npx tsc --noEmit && npm test && npm run build`；`npm run walkthrough`（URL 自動帶 `quality=high`），Read L1-S3、L2-S1、L3-S0、L3-S4、L3-S5、L5-S2、L6-S1：標籤都換成新樣式、示意以 ≈ 圖示呈現、引線指到物體。

```bash
git add -A src
git commit -m "feat(ui): callouts with leader lines, name labels and mark icons"
```

---

### Task 5：課程資料模型與少字改寫

**Files:**
- Create: `src/ui/emphasis.ts`, `src/ui/emphasis.test.ts`, `src/tour/glossary.ts`, `src/tour/glossary.test.ts`
- Modify: `src/tour/types.ts`, `src/tour/engine.ts`, `src/tour/engine.test.ts`, `src/tour/context.ts`, `src/tour/context.test.ts`, `src/tour/levels.ts`, `src/tour/levels.test.ts`, `src/ui/fallback.ts`, `src/ui/fallback.test.ts`, `src/ui/FallbackApp.tsx`, `src/ui/TourPanel.tsx`（暫時改讀 `moreOf`，完整面板在 Task 6）

**Interfaces:**
- Produces（`types.ts`）：
  - `type Mark = 'illustrative' | 'assumption' | 'unverified'`（re-export 自 `src/ui/marks.ts`）
  - `type BigNumber = { value: string; label: string; fraction?: number; mark?: Mark; colorKey?: string }`
  - `type CalloutSpec = { anchor: { kind: 'holding'; holdingId: string } | { kind: 'building'; id: string }; title: string | ((c: TextContext) => string); sub?: string | ((c: TextContext) => string) }`
  - `Step` 改為：`{ id; title: string; line: string | ((c) => string); more: string | ((c) => string); fallbackMore?: …; mark?: 'illustrative' | 'assumption'; bigNumber?: (c: TextContext) => BigNumber; focus?: { holdings?: string[] }; callouts?: CalloutSpec[]; scene; controls?; until? }`（`text` → `more`、`fallbackText` → `fallbackMore`）
  - `TextContext` 新增 `expenseRatio(productId): number | undefined`、`overlapShared(a, b): number`（0–1）
- Produces（`engine.ts`）：`lineOf(step, ctx)`、`moreOf(step, ctx)`（取代 `textOf`）、`titleOf(step)`
- Produces（`emphasis.ts`）：`parseEmphasis(line): { text: string; em: boolean }[]`、`visibleLength(line): number`（去掉 `**` 後以 `Array.from` 計字）

- [ ] **Step 1：`emphasis.ts`（TDD）**

測試：
```ts
import { describe, it, expect } from 'vitest'
import { parseEmphasis, stripMarkup, visibleLength } from './emphasis'

describe('parseEmphasis', () => {
  it('splits **keywords** into emphasised segments', () => {
    expect(parseEmphasis('樓越**高**，公司越**大**')).toEqual([
      { text: '樓越', em: false },
      { text: '高', em: true },
      { text: '，公司越', em: false },
      { text: '大', em: true },
    ])
  })
  it('handles text without markers', () => {
    expect(parseEmphasis('拿起雷射刀')).toEqual([{ text: '拿起雷射刀', em: false }])
  })
  it('reads a colour key after |', () => {
    expect(parseEmphasis('**台積電|2330**佔了')).toEqual([
      { text: '台積電', em: true, key: '2330' },
      { text: '佔了', em: false },
    ])
  })
})

describe('stripMarkup', () => {
  it('removes markers and colour keys', () => {
    expect(stripMarkup('**台積電|2330**佔了約 **56%**')).toBe('台積電佔了約 56%')
  })
})

describe('visibleLength', () => {
  it('ignores markers and counts characters', () => {
    expect(visibleLength('樓越**高**，公司越**大**')).toBe(9)
    expect(visibleLength('**台積電|2330**佔了')).toBe(5)
    expect(visibleLength('把 **0050** 切開')).toBe(9)
  })
})
```
實作：
```ts
export type Segment = { text: string; em: boolean; key?: string }

/** `**詞**` 強調；`**詞|鍵**` 強調並用「鍵」對應的物體顏色（3b1b 顏色連結）。 */
export function parseEmphasis(line: string): Segment[] {
  return line
    .split('**')
    .map((raw, i): Segment => {
      if (i % 2 === 0) return { text: raw, em: false }
      const bar = raw.indexOf('|')
      return bar < 0 ? { text: raw, em: true } : { text: raw.slice(0, bar), em: true, key: raw.slice(bar + 1) }
    })
    .filter((s) => s.text.length > 0)
}

export function stripMarkup(line: string): string {
  return parseEmphasis(line).map((s) => s.text).join('')
}

export function visibleLength(line: string): number {
  return Array.from(stripMarkup(line)).length
}
```

- [ ] **Step 1b：術語表與寫作規則（參考 ASD-STE100，TDD）**

使用者指定參考 ASD-STE100（簡化技術英文）。規則見規格 §2.1：一詞一義、一句一事、操作句先寫動作、定義句用「A＝B」、主動語態（不用「被」）、多說一點也要短、警告先講結論。比喻保留，但一個比喻只對應一個概念。

`src/tour/glossary.ts`（純）：
```ts
import { stripMarkup } from '../ui/emphasis'

/** 一詞一義：每個概念只用 term；forbidden 是不可使用的同義詞。 */
export const GLOSSARY = [
  { term: '配息', means: '股票、基金、ETF 付給你的錢', forbidden: ['股息', '股利', '派息', '分紅'] },
  { term: '利息', means: '債券付給你的錢', forbidden: [] },
  { term: '內扣費用', means: '每年從基金或 ETF 資產扣掉的費用', forbidden: ['管理費', '費用率'] },
  { term: '漲', means: '價格變高', forbidden: ['上升', '上揚', '走高'] },
  { term: '跌', means: '價格變低', forbidden: ['下滑', '走低', '下挫'] },
] as const

/** 專有名稱，檢查禁用詞前先移除。 */
export const PROPER_NAMES = ['高股息'] as const

/** 有 until 的步驟，line 必須用這些動作詞開頭。 */
export const ACTION_VERBS = ['拖', '點', '切', '按', '選', '看'] as const

export const LINE_SENTENCES_MAX = 2
export const LINE_SENTENCE_MAX = 16
export const MORE_SENTENCES_MAX = 4
export const MORE_SENTENCE_MAX = 25

/** 用 。！？ 分句，去掉 ** 與空白句。 */
export function sentences(text: string): string[] {
  return stripMarkup(text)
    .split(/[。！？]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function forbiddenWordsIn(text: string): string[] {
  let t = text
  for (const n of PROPER_NAMES) t = t.replaceAll(n, '')
  return GLOSSARY.flatMap((g) => g.forbidden.filter((w) => t.includes(w)))
}
```
`src/tour/glossary.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { forbiddenWordsIn, sentences } from './glossary'

describe('sentences', () => {
  it('splits on full stops and drops emphasis markers', () => {
    expect(sentences('拖**時間軸**。看**配息**那一刻')).toEqual(['拖時間軸', '看配息那一刻'])
    expect(sentences('塔變矮！因為發的是本金。')).toEqual(['塔變矮', '因為發的是本金'])
  })
})

describe('forbiddenWordsIn', () => {
  it('finds synonyms that the glossary bans', () => {
    expect(forbiddenWordsIn('看發股利那一刻')).toEqual(['股利'])
    expect(forbiddenWordsIn('管理費每天磨掉一點')).toEqual(['管理費'])
  })
  it('allows proper names such as 高股息', () => {
    expect(forbiddenWordsIn('高股息：專挑冒金幣的')).toEqual([])
  })
})
```

- [ ] **Step 2：型別、引擎、context**

依 Interfaces 修改；`textOf` 改名 `moreOf`（全案更新呼叫點）；新增 `lineOf`、`titleOf`。`makeTextContext` 新增：
```ts
    expenseRatio: (productId) => u.get(productId)?.fees?.expenseRatio,
    overlapShared: (a, b) => overlap(u, a, b).total,
```
（`import { overlap } from '../sim/overlap'`）。更新 `engine.test.ts`、`context.test.ts`。

- [ ] **Step 3：改寫 `levels.ts`**

每一步：原本的 `text` 改名為 `more`，新增 `title`、`line`，依下表加 `mark`、`bigNumber`、`focus`、`callouts`。`line` 中的數字用函式即時計算（`pct0`、`signedPct`）。

| id | title | line | mark | bigNumber | focus／callouts |
|---|---|---|---|---|---|
| p-1 | 歡迎來到積木城市 | **一棟大樓**＝**一家公司** | | | callout building 2330：「台積電」／「一棟大樓＝一家公司」 |
| p-2 | 樓高＝公司大小 | 樓越**高**，公司越**大** | | | callout building 2330：「最高」 |
| p-3 | 巨人在美國 | **輝達**、**蘋果**、**微軟**都在這 | | | callout building NVDA：「輝達」 |
| s-1 | 拿走一顆方塊 | 買股票＝擁有**一小塊**公司 | | | |
| s-2 | 公司變值錢 | 樓長高，你的方塊**變大** | illustrative | | |
| s-3 | 公司變不值錢 | 樓縮水，你的方塊**變小** | illustrative | | |
| s-4 | 晃動＝波動 | 有些股票晃得**特別兇** | illustrative | | |
| s-5 | 發金幣 | 拖**時間軸**。看**配息|coin**那一刻 | illustrative | | |
| s-6 | 除息 | 方塊＋金幣＝**不變** | illustrative | `{ value: '100', label: '方塊 95 ＋ 金幣 5', mark: 'illustrative' }` | |
| s-7 | 貼息 | 要看**方塊＋金幣**的總和 | illustrative | | |
| b-1 | 借錢給大樓 | 債券＝**借據**，固定滴**金幣|coin** | illustrative | | |
| b-2 | 三種借據 | 越**穩**的，利息通常**越少** | illustrative | | |
| b-3 | 經濟風暴 | 利息高的，比較**容易裂** | illustrative | | |
| f-1 | 怪手幫你挑 | 基金＝**經理人**幫你挑方塊 | | | |
| f-2 | 拆開看看 | 拖**拆開**。看裡面有什麼 | | | |
| f-3 | 股票＋債券 | 兩種都有，叫**平衡型** | | | focus NVDA、US_TREASURY；callout holding NVDA「輝達」、US_TREASURY「美國公債」 |
| f-4 | 同名不同料 | 也叫多重資產，裡面**不一樣** | | `可轉債 ${pct0(w('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US'))}%`，fraction = w/100，colorKey CONVERTIBLE_US | focus CONVERTIBLE_US |
| f-5 | 計費表在跑 | **內扣費用**每天磨掉一點 | | `${(er*100).toFixed(2)}%`，label「每年內扣費用」（er 來自 `c.expenseRatio('JH_BALANCED')`） | |
| f-6 | 入口門、出口門 | 拖**持有年數**。比較費用 | assumption | | |
| f-7 | 後收不是免費 | 越**早賣**，扣得越多 | | | |
| f-8 | 配息或累積 | 拖滑桿。看**再投資**的塔 | illustrative | | |
| f-9 | 配息陷阱 | 拖滑桿。配息削掉**本金|loss** | illustrative | | |
| e-1 | 照藍圖組合 | ETF＝照**指數**自動挑 | | | |
| e-2 | 拿起雷射刀 | 拖**雷射刀**。切開 0050 | | | |
| e-3 | 台積電一大塊 | **台積電|2330**佔了約 **${pct0(w('0050','2330'))}%** | | `${pct0(w)}%`，label「台積電在 0050」，fraction w/100，colorKey 2330 | focus 2330；callout holding 2330「台積電」／「最厚的一層」 |
| e-4 | 隨時有價格 | ETF 開盤**隨時能買賣** | illustrative | | |
| e-5 | 內扣費用低 | QQQ、SPY **內扣費用**低 | | `${(er('QQQ')*100).toFixed(2)}%`，label「QQQ 每年內扣」 | |
| c-1 | 假設台積電跌 | 假設台積電跌 **${pct0(30)}%** | | | |
| c-2 | 誰受傷最重 | 0050 跟著跌約 **${signedPct(shock)}** | | `${signedPct(c.shock('0050'))}`，label「0050」，fraction = |shock| / 0.3 | |
| c-3 | 重疊 | 買兩檔≠**分散兩倍** | | `至少 ${(overlapShared*100).toFixed(1)}%`，label「QQQ 與 SPY 重疊」 | |
| c-4 | 往地底鑽 | 看看 ETF 還有**哪幾種** | | | |
| u-1 | 地層＝產業 | 每一層是**一種產業** | | | |
| u-2 | 垂直岩芯 | 0050：**半導體|semiconductor**至少 **${pct0(sp)}%** | | `至少 ${pct0(sp)}%`，label「0050 的半導體」，fraction sp/100 | |
| u-3 | 水平挖 | 只挖**一層**＝產業型 | illustrative | | |
| u-4 | 金幣礦脈 | 高股息：專挑**冒金幣**的 | illustrative | | |
| u-5 | 黃金礦脈 | 黃金**不配息**，看市場價 | illustrative | | |
| u-6 | 完成！ | 沙盒**解鎖**了，自由玩 | | | |

**顏色鍵**：`|` 後面可用持股或資產 id（顏色取 `lookFor(asset).color`）、`SECTOR_COLORS` 的產業 id、`coin`（金幣色 `#ffd54f`）、`loss`（損失紅 `#e53935`）。在 `palette.ts` 新增 `ACCENT_COLORS = { coin: '#ffd54f', loss: '#e53935' }`，`CoinDrip` 與 `VoxelInstances` 的 `DAMAGE_COLOR` 改用它；再新增純函式 `colorForKey(u: Universe, key: string): string | undefined` 並測試三種鍵與未知鍵。課程規則測試加上：每個顏色鍵都能被 `colorForKey` 解析。

**多說一點（`more`）也要依寫作規則重寫**：保留原本的教學事實與即時計算的數字，但每句 ≤ 25 字、最多 4 句、只用「。！？」斷句（不要用逗號串成長句）、不用「被」、用術語表的詞；警告先講結果再講原因（例如 f-9：「塔變矮。因為配息削掉本金。」）；示意步驟的 `more` 要保留「示意」二字。`fallbackMore` 同樣規則。

（`w(p, h)` = `c.weightPct(p, h)`；`sp` = `c.sectorPct('0050', 'semiconductor')`；`er(id)` = `c.expenseRatio(id)`，undefined 時不顯示大數字。）

- [ ] **Step 4：課程規則測試（`levels.test.ts`）**

新增：
```ts
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
```
新增寫作規則測試（ASD-STE100 中文版）：
```ts
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
```
原本「文字含『示意』」的測試改對 `more` 檢查（多說一點仍保留原文）。e-3、c-2 的數字測試改對 `lineOf` 與 `bigNumber` 檢查。

- [ ] **Step 5：文字版**

`fallback.ts` 每步輸出 `{ id, title, line, more, rows }`；`FallbackApp` 顯示標題（粗體）、一句話（關鍵詞強調）、多說一點（`<details>` 收起）、數字表。`fallbackMore` 取代 `fallbackText`。更新測試。

- [ ] **Step 6：測試並 Commit**

`npx tsc --noEmit && npm test && npm run build`

```bash
git add -A src
git commit -m "feat(tour): short titles, one-line lessons, big numbers and focus data for every step"
```

---

### Task 6：深色玻璃面板（少字版）

**Files:**
- Create: `src/ui/panel/StepHeader.tsx`, `src/ui/panel/OneLine.tsx`, `src/ui/panel/BigNumberCard.tsx`, `src/ui/panel/MoreSection.tsx`, `src/ui/panel/StepNav.tsx`
- Modify: `src/ui/TourPanel.tsx`, `src/ui/SandboxPanel.tsx`, `src/ui/strings.ts`, `src/ui/ui.css`

**Interfaces:**
- Consumes: `titleOf`、`lineOf`、`moreOf`、`parseEmphasis`、`stageReadout`、`MarkIcon`、`chapterIndexLabel`（本任務自行計算 `NN / 07`）
- Produces: 面板由上到下：品牌「積 木 城 市」（`T.brand`）→ 章節圖示＋步驟編號（`04 / 07`，取自章節）→ 大標題（`title`＋可選 `mark`）→ 一句話（`OneLine`，關鍵詞用 `--em` 顏色）→ 大數字卡（有 `bigNumber` 時）→ 控制項（有 `controls` 時）→ 嘗試提示（未滿足 `until`）→ `StepNav`（上一步／下一步）→ `MoreSection`（`<details>` 預設收起：`more` 文字＋數字表）

- [ ] **Step 1：strings**

```ts
  brand: '積 木 城 市',
  more: '多說一點',
  sandboxTitle: '自由探索',
  chapters: [
    { icon: '🏙', name: '序章' },
    { icon: '🧱', name: '股票' },
    { icon: '📜', name: '債券' },
    { icon: '🚜', name: '基金' },
    { icon: '🧩', name: 'ETF' },
    { icon: '⚡', name: '情境' },
    { icon: '🪨', name: '地底' },
  ],
  chapterCounter: (i: number, n: number) => `${String(i).padStart(2, '0')} / ${String(n - 1).padStart(2, '0')}`,
```

- [ ] **Step 2：元件**

`OneLine.tsx`：
```tsx
import { parseEmphasis } from '../emphasis'

export function OneLine({ line }: { line: string }) {
  return (
    <p className="oneline">
      {parseEmphasis(line).map((s, i) => (s.em ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </p>
  )
}
```
`BigNumberCard.tsx`：
```tsx
import type { BigNumber } from '../../tour/types'
import { MarkIcon } from '../MarkIcon'

export function BigNumberCard({ n }: { n: BigNumber }) {
  return (
    <div className="bignum">
      <div className="bignum__value">
        {n.value}
        {n.mark && <MarkIcon kind={n.mark} />}
      </div>
      <div className="bignum__label">{n.label}</div>
      {n.fraction !== undefined && (
        <div className="bignum__bar" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(1, n.fraction)) * 100}%` }} />
        </div>
      )}
    </div>
  )
}
```
`StepHeader.tsx`：品牌（`.brand`，字距加寬）、`T.chapters[level].icon` ＋ `T.chapterCounter(level, LEVELS.length)`、`<h1 className="step-title">{title}{mark && <MarkIcon kind={mark} />}</h1>`（`aria-live="polite"` 放在標題＋一句話的外層）。
`MoreSection.tsx`：`<details className="more"><summary>{T.more}</summary><p>{more}</p>{readout table}</details>`（表格沿用現有 readout 表，`mark` 用 `MarkIcon`）。
`StepNav.tsx`：上一步／下一步（主要按鈕 `--accent`），沿用 `aria-describedby` 指向提示。

3b1b 動態（`prefers-reduced-motion` 時全部直接顯示最終狀態）：
- `OneLine` 收 `colorOf: (key: string) => string | undefined`，有 `key` 的強調段落用該顏色（並保留粗體）；沒有 key 的用 `--em`。
- **先看再命名**：`TourPanel` 讀 `document.body.dataset.cameraSettled`（用 `MutationObserver` 監聽 body 的 `data-camera-settled`／`data-camera-seq`），鏡頭停下前標題與一句話 `opacity: 0`；停下後加 class `is-revealed`，標題淡入，`OneLine` 每段 `style={{ animationDelay: `${i * 80}ms` }}` 依序淡入（CSS `@keyframes reveal { from { opacity: 0; transform: translateY(4px) } }`）。換步驟時重置。若 1.5 秒內沒有停下，仍然顯示（避免卡住）。
- **數字長出來**：純函式 `countUp(value: string, t: number): string`（放 `src/ui/emphasis.ts` 旁的 `src/ui/countUp.ts` 並測試）：把字串中第一個數字依 `t`（0–1，ease-out）從 0 長到目標，保留小數位數與前後文字；例如 `countUp('56%', 0.5)` 的數字介於 0 和 56 之間且格式為整數，`countUp('至少 63%', 1) === '至少 63%'`、`countUp('-16.9%', 1) === '-16.9%'`、沒有數字時原樣回傳。`BigNumberCard` 在顯示後用 `requestAnimationFrame` 600ms 跑完；色條寬度同步長出，顏色用 `colorKey`。

`TourPanel` 依 Produces 的順序組合；`SandboxPanel` 用同樣的玻璃樣式：品牌＋「自由探索」標題＋商品膠囊＋控制項＋圖例；重看導覽按鈕移到 Task 7 的工具列。

- [ ] **Step 3：CSS**

```css
.panel { background: var(--surface); border: 1px solid var(--border); backdrop-filter: blur(14px); color: var(--text); }
.brand { margin: 0 0 14px; font-size: 12px; letter-spacing: 0.6em; color: var(--muted); }
.step-counter { font-size: 12px; letter-spacing: 0.25em; color: var(--muted); }
.step-title { margin: 4px 0 6px; font-size: 26px; font-weight: 600; letter-spacing: 0.02em; display: flex; gap: 8px; align-items: center; }
.oneline { margin: 0 0 12px; font-size: 17px; line-height: 1.6; }
.oneline strong { color: var(--em); font-weight: 700; }
.bignum { margin: 8px 0 12px; padding: 12px 14px; border-radius: 12px; background: var(--chip); border: 1px solid var(--border); }
.bignum__value { font-size: 34px; font-weight: 700; display: flex; gap: 8px; align-items: center; font-variant-numeric: tabular-nums; }
.bignum__label { font-size: 13px; color: var(--muted); }
.bignum__bar { margin-top: 8px; height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
.bignum__bar span { display: block; height: 100%; background: var(--accent); }
.more { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 14px; color: var(--muted); }
.more summary { cursor: pointer; color: var(--text); }
```
（舊的 `.tour__text` 等不再使用的樣式刪除。）

- [ ] **Step 4：測試、截圖、Commit**

`npx tsc --noEmit && npm test && npm run build`；截圖黃昏與白天：`/?level=4&step=2&quality=high`（e-3：大數字卡 56% 與藍條）、`/?level=3&step=5&quality=high`（f-6：✎ 圖示、控制項、多說一點收起）、手機 390×844 的 e-3；Read 並確認字數少、層次清楚、白天也好讀。

```bash
git add -A src
git commit -m "feat(ui): glass panel with short title, one line, big number and collapsible more"
```

---

### Task 7：章節時間軸、工具列、圖例、版面模型

**Files:**
- Create: `src/ui/chapters.ts`, `src/ui/chapters.test.ts`, `src/ui/layoutModel.ts`, `src/ui/layoutModel.test.ts`, `src/ui/ChapterTimeline.tsx`, `src/ui/Toolbar.tsx`, `src/ui/Legend.tsx`
- Modify: `src/App.tsx`, `src/scene/ViewFraming.tsx`, `src/ui/layout.ts`（併入或刪除）, `src/ui/ui.css`, `src/ui/strings.ts`

**Interfaces:**
- Produces:
  - `chapterStates(levels, pos, progress): { index: number; state: 'done' | 'current' | 'todo'; clickable: boolean }[]`（`done` = id 在 `progress.completed`；`current` = `pos.level`；`clickable` = 已解鎖沙盒或 state 不是 `todo`）
  - `layoutModel(w: number, h: number): { mobile: boolean; insets: { top: number; right: number; bottom: number; left: number } }`（`MOBILE_MAX = 720`；桌機 top 64、left `PANEL_WIDTH + 24`、bottom 76、right 0；手機 top 56、bottom `round(h * 0.42) + 40`、left 0、right 0）
  - `Toolbar()`：☾ 黃昏／☀ 白天切換、🏷 標註開關、🎨 圖例開關；沙盒模式另有「重看導覽」
  - `ChapterTimeline()`：7 章（圖示＋編號＋名稱）＋進度條；點可點擊的章節 → `enterStep({ level: i, step: 0 })`
  - `Legend()`：產業色票（`SECTOR_COLORS` × `T.sectors`）＋未細分

- [ ] **Step 1：純函式測試**

`chapters.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { LEVELS } from '../tour/levels'
import { chapterStates } from './chapters'

describe('chapterStates', () => {
  it('marks done, current and todo chapters', () => {
    const s = chapterStates(LEVELS, { level: 2, step: 0 }, { completed: ['prologue', 'stock'], sandboxUnlocked: false })
    expect(s.map((c) => c.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo', 'todo'])
    expect(s.map((c) => c.clickable)).toEqual([true, true, true, false, false, false, false])
  })
  it('makes everything clickable once the sandbox is unlocked', () => {
    const s = chapterStates(LEVELS, { level: 0, step: 0 }, { completed: [], sandboxUnlocked: true })
    expect(s.every((c) => c.clickable)).toBe(true)
  })
})
```
`layoutModel.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { layoutModel } from './layoutModel'

describe('layoutModel', () => {
  it('reserves the panel, toolbar and timeline on desktop', () => {
    expect(layoutModel(1280, 800)).toEqual({ mobile: false, insets: { top: 64, right: 0, bottom: 76, left: 336 } })
  })
  it('reserves the drawer and top bar on mobile', () => {
    expect(layoutModel(390, 844)).toEqual({ mobile: true, insets: { top: 56, right: 0, bottom: 394, left: 0 } }) // round(844×0.42)=354 +40
  })
})
```
（`PANEL_WIDTH` 312 → left 336。）

- [ ] **Step 2：實作**

依 Interfaces 實作 `chapters.ts`、`layoutModel.ts`（`PANEL_WIDTH` 從 `layout.ts` 搬來，`layout.ts` 刪除並更新引用）。`ViewFraming` 改讀 `layoutModel(size.width, size.height).insets`：
- `setViewOffset` 的 x 位移 = `(left − right) / 2`、y 位移 = `(top − bottom) / 2`（往可視區中心）
- 縮放沿用現有規則，但可用寬高改為扣掉 insets 後的區域；刪除寫死的 0.21 與重複的 720。
CSS 斷點維持 `@media (max-width: 720px)`，並在 `layoutModel.ts` 註明需與 CSS 一致。

元件：
- `Toolbar`：固定右上；膠囊按鈕（`.pill`，`aria-pressed`）；文字從 `T.toolbar = { dusk: '☾ 黃昏', day: '☀ 白天', labels: '🏷 標註', legend: '🎨 圖例', replay: '↺ 重看導覽' }`。主題切換後 `invalidate()`（可透過 store 訂閱在 Scene 內處理）。
- `ChapterTimeline`：固定底部（桌機從面板右側開始）；每章 `button`（不可點擊時 `disabled`），目前章節高亮；下方進度條用 `progressFraction`。手機：只顯示 7 個圖示小點與進度條。沙盒模式也顯示（全部可點，點了進入導覽該章）。
- `Legend`：`legend` 為 true 時顯示在工具列下方的色票列。

CSS：
```css
.toolbar { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 6; }
.pill { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 999px; padding: 8px 14px; font: inherit; font-size: 14px; cursor: pointer; backdrop-filter: blur(10px); }
.pill[aria-pressed='true'] { border-color: var(--accent); }
.legend-bar { position: fixed; top: 60px; right: 12px; display: flex; gap: 12px; padding: 8px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); font-size: 13px; z-index: 6; }
.legend-bar i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: middle; }
.timeline { position: fixed; left: calc(var(--panel-w) + 24px); right: 12px; bottom: 12px; padding: 10px 16px 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); z-index: 5; }
.timeline__chapters { display: flex; justify-content: space-between; gap: 4px; }
.timeline__chapter { border: 0; background: none; color: var(--muted); font: inherit; font-size: 13px; letter-spacing: 0.12em; cursor: pointer; }
.timeline__chapter[aria-current='step'] { color: var(--text); font-weight: 600; }
.timeline__chapter:disabled { opacity: 0.35; cursor: default; }
.timeline__bar { margin-top: 8px; height: 3px; border-radius: 2px; background: var(--border); overflow: hidden; }
.timeline__bar span { display: block; height: 100%; background: var(--accent); }
@media (max-width: 720px) {
  .toolbar { top: 8px; right: 8px; gap: 4px; }
  .pill { padding: 6px 10px; font-size: 12px; }
  .timeline { left: 8px; right: 8px; bottom: calc(42vh + 8px); padding: 6px 10px; }
  .timeline__chapter .timeline__name { display: none; }
}
```

- [ ] **Step 3：測試、截圖、Commit**

`npx tsc --noEmit && npm test && npm run build`；截圖黃昏與白天的 `/?level=4&step=2&quality=high`（桌機＋手機）與 `/?mode=sandbox&quality=high`；Read：工具列、時間軸、面板互不重疊，3D 重點在可視區中央，手機不橫向捲動。

```bash
git add -A src
git commit -m "feat(ui): chapter timeline, toolbar, legend and a single layout model"
```

---

### Task 8：步驟焦點與標註接上 3D

**Files:**
- Create: `src/scene/StepCallouts.tsx`
- Modify: `src/scene/BasketView.tsx`, `src/scene/City.tsx`, `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: `Step.focus`、`Step.callouts`、`layerCentroid`、`basketSpec`、`basketVoxels`、`cityLayout`、`Callout`、`EXCHANGE_POSITION`
- Produces:
  - 導覽模式下，交易所籃子的 `focusIds` = `step.focus?.holdings ?? []`
  - `StepCallouts()`：把 `step.callouts` 轉成 `Callout`：`holding` 錨點 = 交易所籃子中該持股的層中心（含目前拆開程度）往外偏移；`building` 錨點 = 大樓頂端（`cityLayout` 的位置與高度）往上偏移

- [ ] **Step 1：實作**

- `BasketView`：導覽模式讀 `currentStep(...).focus?.holdings` 傳入 `Basket`。
- `StepCallouts`：
  - holding：`const spec = basketSpec(universe, productId, quality)`、`voxels = basketVoxels(...)`、`group = holdings.findIndex(h => h.id === holdingId)`、`c = layerCentroid(voxels, group, spec.w, spec.d, explode, holdings.length)`；錨點 = `[EXCHANGE_POSITION[0] + spec.w / 2 + 0.2, PEDESTAL_HEIGHT + c[1], EXCHANGE_POSITION[2] + c[2]]`（籃子右側面），`offset = [4, 1.5, 0]`。
  - building：從 `cityLayout([...universe.values()])` 找該 id，錨點 `[x, height + 0.2, z]`，`offset = [0, 3, 0]`。
  - 標題／副標用 `titleOf`／函式求值（`makeTextContext`）。
  - 3b1b 顏色連結：`Callout` 新增可選 `color` prop（標題前的小色點與引線錨點用這個顏色）；holding 標註傳 `colorForKey(universe, holdingId)`，building 標註傳 `colorForKey(universe, id)`。
- `PEDESTAL_HEIGHT`（目前是 `Scene.tsx` 內的區域常數 0.6）搬到 `src/scene/stage/plaza.ts` 並 export，Scene 與 StepCallouts 共用。
- `Scene` 在導覽模式掛 `<StepCallouts />`。
- 城市大樓若是某步驟 callout 的 building 錨點，該大樓 `NameLabel` 改 `active`，顏色鮮豔（`City` 讀目前步驟）。

- [ ] **Step 2：測試、截圖、Commit**

`npx tsc --noEmit && npm test && npm run build`；截圖 p-1、p-3、f-3、e-3（黃昏桌機、`quality=high`），Read：引線從物體指出、標題正確、焦點那層鮮豔其他低飽和。

```bash
git add -A src
git commit -m "feat(scene): step focus highlights and callouts anchored to holdings and buildings"
```

---

### Task 9：e2e 與走查（黃昏＋白天）

**Files:**
- Modify: `e2e/*.spec.ts`, `scripts/walkthrough.mjs`, 依截圖結果調整的檔案

- [ ] **Step 1：e2e 更新**

- 既有測試改用新的按鈕名稱（下一步／進入沙盒不變；「重看導覽」改在工具列）。
- 新增：工具列切到白天後重新整理仍是白天（`html[data-theme="day"]`）；點章節時間軸已完成的章節會跳到該章第一步（面板章節編號改變）；未解鎖時未來章節是 `disabled`。
- 文字版：確認每章顯示標題與一句話，多說一點預設收起。

- [ ] **Step 2：走查**

`scripts/walkthrough.mjs` 增加參數 `theme`（預設 dusk，傳入時在每個 URL 加 `&theme=`）。跑四輪：黃昏桌機、黃昏手機、白天桌機、白天手機。逐張 Read，檢查：
- 每一步不開「多說一點」也能從標題＋一句話＋畫面看懂重點
- 標註引線指對物體、不互相重疊、不壓在面板／工具列／時間軸下
- 示意的步驟有 ≈ 圖示；f-6 有 ✎；待驗證有 ？
- 黃昏暗而不髒、白天亮而不刺眼；低飽和方塊仍分得出產業
修正問題後重跑，直到通過。

- [ ] **Step 3：全部檢查並 Commit**

`npx tsc --noEmit && npm test && npm run build && npm run e2e`

```bash
git add -A src e2e scripts
git commit -m "test: e2e for theme, timeline and low-text panel; dusk/day walkthrough fixes"
```
