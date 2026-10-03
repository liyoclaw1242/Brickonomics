import { test, expect } from '@playwright/test'

test('text-only course renders every level', async ({ page }) => {
  await page.goto('/?fallback=1')
  await expect(page.getByText('你的瀏覽器無法顯示 3D 畫面')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(7)
})
