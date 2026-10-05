import { test, expect } from '@playwright/test'
import { cameraSeq, setRange, settled } from './helpers'

// 需要先操作才能前進的步驟：門檻（control 與 min）直接取自課程資料，這裡只負責 control → 畫面上的名稱
const CONTROL_LABEL: Record<string, string> = {
  slice: '雷射刀切割',
  explode: '拆開',
  years: '持有年數',
  periods: '經過年數',
  phase: '時間軸',
  frontLoad: '假設的前收手續費',
  tick: '時間軸',
  rate: '市場利率',
  months: '經過月數',
}

test('walks the whole 中階 course by clicking 下一步 and unlocks the sandbox', async ({ page }) => {
  test.setTimeout(300_000) // 軟體渲染約 1fps，整門課 25 步要一分鐘左右（初階由下面的第一次來測試走完）
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high&course=intermediate') // 指定課程，不出現第一次來的開場卡
  const next = page.locator('.step-nav button.primary') // 結尾步另有「去自由玩」按鈕，用位置找下一步
  const ids = await page.evaluate(() => (window as unknown as { __BCI_COURSES__: Record<string, string[]> }).__BCI_COURSES__.intermediate!)
  const gates = await page.evaluate(() => (window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__)
  const GATES = new Map(gates.map((g) => [g.id, g]))
  expect(GATES.size).toBeGreaterThan(0)
  // Plan 7 的新門檻（拖到谷底、數滿 60 年、利率拉到 5%、買滿 12 個月）都在這條路上
  for (const id of ['s-dd', 's-pe', 'b-rate', 'e-dca']) {
    expect(ids, id).toContain(id)
    expect(GATES.has(id), id).toBe(true)
  }
  let before = 0
  for (const id of ids) {
    await settled(page, before)
    const gate = GATES.get(id)
    if (gate) {
      await expect(next).toBeDisabled()
      const label = CONTROL_LABEL[gate.control]
      expect(label, `no label for control ${gate.control}`).toBeTruthy()
      await setRange(page, label!, gate.min)
    }
    await expect(next).toBeEnabled()
    before = await cameraSeq(page)
    await next.click()
  }
  await expect(page.getByRole('navigation', { name: '畫面設定' }).getByRole('button', { name: '↺ 重看導覽' })).toBeVisible() // 沙盒模式才出現在右上工具列
  expect(errors).toEqual([])
})

test('resumes from the last step after reload', async ({ page }) => {
  await page.goto('/?course=intermediate&step=b-2&quality=high')
  await settled(page)
  await page.goto('/?quality=high')
  await expect(page.locator('.step-counter')).toContainText('02 / 05') // 中階的章節編號（第 2 章，共 0–5）
  await expect(page.locator('.step-title__text')).toHaveText('三種借據')
})

test('theme chosen in the toolbar survives a reload', async ({ page }) => {
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high&course=beginner')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dusk') // 預設黃昏
  const toolbar = page.getByRole('navigation', { name: '畫面設定' })
  await toolbar.getByRole('button', { name: /切換到白天/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await expect(toolbar.getByRole('button', { name: /切換到黃昏/ })).toBeVisible()
})

test('the chapter timeline jumps back to a finished chapter and locks future ones', async ({ page }) => {
  await page.goto('/?quality=high')
  // 舊存檔：已完成序章與股票、停在債券第 2 步（b-2，中階）、尚未解鎖沙盒 → 遷移成中階、複習與股票章已完成
  await page.evaluate(() =>
    localStorage.setItem('block-city-invest:progress', JSON.stringify({ completed: ['prologue', 'stock'], sandboxUnlocked: false, pos: { level: 2, step: 1 } })),
  )
  await page.goto('/?quality=high')
  await expect(page.locator('.step-counter')).toContainText('02 / 05')
  const timeline = page.getByRole('navigation', { name: '章節' })
  await expect(timeline.getByRole('button', { name: '05 完成' })).toBeDisabled()
  await expect(timeline.getByRole('button', { name: '03 基金' })).toBeDisabled()
  await expect(timeline.getByRole('button', { name: '02 債券' })).toHaveAttribute('aria-current', 'step')
  const before = await cameraSeq(page)
  await timeline.getByRole('button', { name: '01 股票' }).click()
  await expect(page.locator('.step-counter')).toContainText('01 / 05')
  await expect(timeline.getByRole('button', { name: '01 股票' })).toHaveAttribute('aria-current', 'step')
  await settled(page, before)
  await expect(page.locator('.step-title__text')).toHaveText('有的晃很兇') // 中階股票章第一步（s-4）
  await expect(page.locator('details.more')).not.toHaveAttribute('open', /.*/) // 多說一點預設收起
})

test('first visit: choose 初階, walk its steps to 自由玩, timeline shows the course chapters', async ({ page }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high')
  // 開場卡：可上的課各一顆大按鈕（高階還沒開放）；還沒選之前沒有時間軸、也沒有下一步
  const beginnerBtn = page.getByRole('button', { name: /初階.*17 步/ })
  await expect(beginnerBtn).toBeVisible()
  await expect(page.getByRole('button', { name: /中階.*25 步/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /高階/ })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: '章節' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /下一步/ })).toHaveCount(0)
  await beginnerBtn.click()
  const timeline = page.getByRole('navigation', { name: '章節' })
  await expect(timeline.getByRole('button')).toHaveText(['🏙00 序章', '🧱01 股票', '📜02 債券', '🚜03 基金', '🧩04 ETF', '🎓05 完成'])
  const ids = await page.evaluate(() => (window as unknown as { __BCI_COURSES__: Record<string, string[]> }).__BCI_COURSES__.beginner!)
  expect(ids).toHaveLength(17)
  const gates = await page.evaluate(() => (window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__)
  const GATES = new Map(gates.map((g) => [g.id, g]))
  const next = page.locator('.step-nav button.primary')
  let before = 0
  for (const id of ids) {
    await settled(page, before)
    const gate = GATES.get(id)
    if (gate) {
      await expect(next).toBeDisabled()
      await setRange(page, CONTROL_LABEL[gate.control]!, gate.min)
    }
    await expect(next).toBeEnabled()
    if (id === ids.at(-1)) {
      await expect(next).toHaveText('自由玩')
      await expect(page.getByRole('button', { name: '下一階：中階 →' })).toBeVisible() // 結尾步推薦下一階
      break
    }
    before = await cameraSeq(page)
    await next.click()
  }
  // 結尾步按「下一階：中階」→ 中階第一步 m-0（序章，時間軸 00）
  before = await cameraSeq(page)
  await page.getByRole('button', { name: '下一階：中階 →' }).click()
  await settled(page, before)
  await expect(page.locator('.step-counter')).toContainText('00 / 05')
  await expect(page.getByRole('navigation', { name: '畫面設定' }).getByRole('button', { name: /中階，換階/ })).toBeVisible()
  // 選過了：重新整理不再問
  await page.reload()
  await expect(page.getByRole('heading', { name: '從哪一階開始？' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the toolbar course switcher opens a menu, closes on Escape, and switches course', async ({ page }) => {
  await page.goto('/?quality=high&course=intermediate&step=s-5')
  await expect(page.locator('.step-title__text')).toHaveText('發金幣那一刻')
  const toolbar = page.getByRole('navigation', { name: '畫面設定' })
  const pill = toolbar.getByRole('button', { name: /中階，換階/ })
  await expect(pill).toHaveAttribute('aria-haspopup', 'menu')
  await pill.click()
  await expect(pill).toHaveAttribute('aria-expanded', 'true')
  const menu = page.getByRole('menu', { name: '選擇課程' })
  await expect(menu.getByRole('menuitemradio', { name: /中階/ })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(pill).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowUp')
  await expect(menu.getByRole('menuitemradio', { name: /初階/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.step-title__text')).toHaveText('歡迎來到積木城市') // 初階沒有 s-5 → 第一步
  await expect(toolbar.getByRole('button', { name: /初階，換階/ })).toBeFocused()
  await expect(page.getByRole('navigation', { name: '章節' }).getByRole('button', { name: '00 序章' })).toBeVisible()
  // 空白鍵也能選；回到還沒上完的中階時，停在上次的那一步
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitemradio', { name: /中階/ })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(menu).toHaveCount(0)
  await expect(page.locator('.step-title__text')).toHaveText('發金幣那一刻')
})

test('legacy URL ?route=simple&level=0&step=0 lands in 初階 at its first step', async ({ page }) => {
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high&route=simple&level=0&step=0')
  await expect(page.getByRole('heading', { name: '從哪一階開始？' })).toHaveCount(0)
  await expect(page.locator('.step-title__text')).toHaveText('歡迎來到積木城市')
  await expect(page.getByRole('navigation', { name: '畫面設定' }).getByRole('button', { name: /初階，換階/ })).toBeVisible()
})

test('an old simple-route save migrates into 初階 without showing the start card', async ({ page }) => {
  await page.goto('/?quality=high')
  await page.evaluate(() =>
    localStorage.setItem('block-city-invest:progress', JSON.stringify({ route: 'simple', completed: ['prologue'], sandboxUnlocked: false, stepId: 'b-3' })),
  )
  await page.goto('/?quality=high')
  await expect(page.getByRole('heading', { name: '從哪一階開始？' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: '畫面設定' }).getByRole('button', { name: /初階，換階/ })).toBeVisible()
  await expect(page.locator('.step-counter')).toContainText('02 / 05')
})
