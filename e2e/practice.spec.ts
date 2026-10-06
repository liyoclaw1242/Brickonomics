import { test, expect } from '@playwright/test'
import { cameraSeq, settled } from './helpers'

// Plan 9：實戰課（拆解一檔真基金）。從開場卡選「實戰」，走完 9 步；結尾是體檢表（每一行附資料日期），不推薦下一階
test('first visit: choose 實戰 on the start card and walk all 9 steps to the checkup card', async ({ page }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high')
  // 開場卡：三階之後多一顆「實戰」，小標不寫第幾階
  const practiceBtn = page.getByRole('button', { name: /實戰.*拆解一檔真基金.*9 步/ })
  await expect(practiceBtn).toBeVisible()
  await expect(practiceBtn).toContainText('真實案例')
  await expect(page.getByRole('button', { name: /初階.*17 步/ })).toBeVisible()
  await practiceBtn.click()
  const timeline = page.getByRole('navigation', { name: '章節' })
  await expect(timeline.getByRole('button')).toHaveText(['🪪00 名片', '🔍01 拆開', '🪙02 配息', '🚪03 費用', '📈04 績效', '🩺05 體檢表'])
  const ids = await page.evaluate(() => (window as unknown as { __BCI_COURSES__: Record<string, string[]> }).__BCI_COURSES__.practice!)
  expect(ids).toEqual(['x-card', 'x-mix', 'x-where', 'x-hy', 'x-cc', 'x-pay', 'x-fee', 'x-perf', 'x-fin'])
  const next = page.locator('.step-nav button.primary')
  let before = 0
  for (const [i, id] of ids.entries()) {
    await settled(page, before)
    await expect(page.locator('.step-counter')).toContainText(`第 ${i + 1} / ${ids.length} 步`)
    await expect(next, id).toBeEnabled() // 實戰課沒有要先拖的門檻
    if (id === 'x-fin') {
      await expect(page.locator('.step-title__text')).toHaveText('體檢表')
      await expect(page.getByText('只是體檢，不是叫你買或賣')).toBeVisible()
      const card = page.getByRole('list', { name: '體檢表' })
      await expect(card.getByRole('listitem')).toHaveCount(6)
      for (const li of await card.getByRole('listitem').all()) await expect(li).toContainText(/資料 20\d\d\/\d{1,2}\/\d{1,2}/)
      await expect(next).toHaveText('自由玩')
      await expect(page.getByRole('button', { name: /下一階/ })).toHaveCount(0) // 實戰課不在階的順序裡
      break
    }
    before = await cameraSeq(page)
    await next.click()
  }
  // 右上角換階選單也有實戰
  const toolbar = page.getByRole('navigation', { name: '畫面設定' })
  await toolbar.getByRole('button', { name: /實戰，換階/ }).click()
  await expect(page.getByRole('menu', { name: '選擇課程' }).getByRole('menuitemradio')).toHaveText([/初階/, /中階/, /高階/, /實戰.*拆解一檔真基金/])
  await page.keyboard.press('Escape')
  await next.click()
  await expect(toolbar.getByRole('button', { name: '↺ 重看導覽' })).toBeVisible()
  expect(errors).toEqual([])
})
