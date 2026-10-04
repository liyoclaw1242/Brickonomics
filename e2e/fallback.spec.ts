import { test, expect } from '@playwright/test'

test('text-only course renders every level', async ({ page }) => {
  await page.goto('/?fallback=1')
  await expect(page.getByText('你的瀏覽器無法顯示 3D 畫面')).toBeVisible()
  const levels = Number(await page.locator('main.fallback').getAttribute('data-levels'))
  expect(levels).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(levels)
})

test('text-only course shows a title and one line per step, with 多說一點 collapsed', async ({ page }) => {
  await page.goto('/?fallback=1')
  const sections = page.locator('.fallback__level')
  const levels = Number(await page.locator('main.fallback').getAttribute('data-levels'))
  await expect(sections).toHaveCount(levels)
  for (let i = 0; i < levels; i++) {
    const s = sections.nth(i)
    const steps = await s.locator('li').count()
    expect(steps, `level ${i} has steps`).toBeGreaterThan(0)
    await expect(s.locator('h3.fallback__title')).toHaveCount(steps)
    await expect(s.locator('.fallback__line')).toHaveCount(steps)
    await expect(s.locator('h3.fallback__title').first()).toBeVisible()
    await expect(s.locator('.fallback__line').first()).toBeVisible()
    await expect(s.locator('h3.fallback__title').first()).not.toHaveText('')
    await expect(s.locator('.fallback__line').first()).not.toHaveText('')
    // 多說一點預設收起：details 沒有 open，摘要看得到、內文看不到
    const more = s.locator('details.fallback__more')
    await expect(more).toHaveCount(steps)
    await expect(s.locator('details.fallback__more[open]')).toHaveCount(0)
    await expect(more.first().locator('summary')).toHaveText('多說一點')
    await expect(more.first().locator('p')).toBeHidden()
  }
})
