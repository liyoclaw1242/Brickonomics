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
}

test('walks the whole tour by clicking 下一步 and unlocks the sandbox', async ({ page }) => {
  test.setTimeout(300_000) // 軟體渲染約 1fps，整段導覽 30+ 步要一至兩分鐘
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high&route=full') // 指定完整版，不出現第一次來的開始卡片
  const next = page.getByRole('button', { name: /下一步|自由玩/ })
  const ids = await page.evaluate(() => (window as unknown as { __BCI_STEP_IDS__: string[] }).__BCI_STEP_IDS__)
  const gates = await page.evaluate(() => (window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__)
  const GATES = new Map(gates.map((g) => [g.id, g]))
  expect(GATES.size).toBeGreaterThan(0)
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
  await page.goto('/?level=2&step=1&quality=high')
  await settled(page)
  await page.goto('/?quality=high')
  await expect(page.locator('.step-counter')).toContainText('02 / 06') // 章節編號（第 2 章，共 0–6）
})

test('theme chosen in the toolbar survives a reload', async ({ page }) => {
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high&route=full')
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
  // 已完成序章與股票、停在債券第 2 步、尚未解鎖沙盒
  await page.evaluate(() =>
    localStorage.setItem('block-city-invest:progress', JSON.stringify({ completed: ['prologue', 'stock'], sandboxUnlocked: false, pos: { level: 2, step: 1 } })),
  )
  await page.goto('/?quality=high')
  await expect(page.locator('.step-counter')).toContainText('02 / 06')
  const timeline = page.getByRole('navigation', { name: '章節' })
  await expect(timeline.getByRole('button', { name: '06 地底' })).toBeDisabled()
  await expect(timeline.getByRole('button', { name: '03 基金' })).toBeDisabled()
  await expect(timeline.getByRole('button', { name: '02 債券' })).toHaveAttribute('aria-current', 'step')
  const before = await cameraSeq(page)
  await timeline.getByRole('button', { name: '01 股票' }).click()
  await expect(page.locator('.step-counter')).toContainText('01 / 06')
  await expect(timeline.getByRole('button', { name: '01 股票' })).toHaveAttribute('aria-current', 'step')
  await settled(page, before)
  await expect(page.locator('h1.step-title')).toHaveText('拿走一顆方塊') // 該章第一步
  await expect(page.locator('details.more')).not.toHaveAttribute('open', /.*/) // 多說一點預設收起
})

test('first visit: choose 簡單版, walk its steps to 自由玩, timeline shows only route chapters', async ({ page }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high')
  // 開始卡片：兩顆大按鈕；還沒選之前沒有時間軸、也沒有下一步
  const simpleBtn = page.getByRole('button', { name: /簡單版（約 17 步）/ })
  await expect(simpleBtn).toBeVisible()
  await expect(page.getByRole('button', { name: /完整版（35 步）/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '章節' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /下一步/ })).toHaveCount(0)
  await simpleBtn.click()
  const timeline = page.getByRole('navigation', { name: '章節' })
  await expect(timeline.getByRole('button')).toHaveText(['🏙00 序章', '🧱01 股票', '📜02 債券', '🚜03 基金', '🧩04 ETF', '⚡05 情境', '🎉06 完成'])
  const ids = await page.evaluate(() => (window as unknown as { __BCI_ROUTES__: { simple: string[] } }).__BCI_ROUTES__.simple)
  expect(ids).toHaveLength(17)
  const gates = await page.evaluate(() => (window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__)
  const GATES = new Map(gates.map((g) => [g.id, g]))
  const next = page.getByRole('button', { name: /下一步|自由玩/ })
  let before = 0
  for (const id of ids) {
    await settled(page, before)
    const gate = GATES.get(id)
    if (gate) {
      await expect(next).toBeDisabled()
      await setRange(page, CONTROL_LABEL[gate.control]!, gate.min)
    }
    await expect(next).toBeEnabled()
    if (id === ids.at(-1)) await expect(next).toHaveText('自由玩')
    before = await cameraSeq(page)
    await next.click()
  }
  await expect(page.getByRole('navigation', { name: '畫面設定' }).getByRole('button', { name: '↺ 重看導覽' })).toBeVisible()
  // 選過了：重新整理不再問
  await page.reload()
  await expect(page.getByRole('button', { name: /簡單版（約 17 步）/ })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the toolbar switches route and stays on the nearest step at or before', async ({ page }) => {
  await page.goto('/?quality=high&route=full&level=1&step=4') // s-5 發金幣那一刻：簡單版沒有
  await expect(page.locator('.step-title__text')).toHaveText('發金幣那一刻')
  const toolbar = page.getByRole('navigation', { name: '畫面設定' })
  await toolbar.getByRole('button', { name: /完整版，切換到簡單版/ }).click()
  await expect(page.locator('.step-title__text')).toHaveText('公司變不值錢') // s-3
  await expect(page.getByRole('navigation', { name: '章節' }).getByRole('button', { name: '06 完成' })).toBeVisible()
  await toolbar.getByRole('button', { name: /簡單版，切換到完整版/ }).click()
  await expect(page.locator('.step-title__text')).toHaveText('公司變不值錢')
  await expect(page.getByRole('navigation', { name: '章節' }).getByRole('button', { name: '06 地底' })).toBeVisible()
})
