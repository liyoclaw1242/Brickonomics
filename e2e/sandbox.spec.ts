import { test, expect } from '@playwright/test'
import { settled } from './helpers'

test('sandbox stays idle when nothing moves', async ({ page }) => {
  await page.goto('/?mode=sandbox&quality=high')
  await settled(page)
  await page.waitForTimeout(1000)
  const f1 = await page.evaluate(() => (window as unknown as { __BCI_FRAMES__: number }).__BCI_FRAMES__)
  await page.waitForTimeout(2000)
  const f2 = await page.evaluate(() => (window as unknown as { __BCI_FRAMES__: number }).__BCI_FRAMES__)
  expect(f2 - f1).toBeLessThanOrEqual(2)
})

test('switching products updates the legend', async ({ page }) => {
  await page.goto('/?mode=sandbox&quality=high')
  await page.getByRole('button', { name: 'Invesco QQQ' }).click()
  await expect(page.locator('.legend__name', { hasText: '輝達' })).toBeVisible()
})
