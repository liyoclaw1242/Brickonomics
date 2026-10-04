// 使用者測試截圖：每一步拍「剛進來」，有拉桿的步驟再拍「拉到底之後」
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [base = 'http://localhost:5173', out = '.superpowers/usertest/r1', w = '1280', h = '800'] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
  await page.goto(`${base}/?quality=high`, { waitUntil: 'networkidle' })
  const steps = await page.evaluate(() => window.__BCI_STEPS__)
  const ids = await page.evaluate(() => window.__BCI_STEP_IDS__)
  let n = 0
  for (let level = 0; level < steps.length; level++) {
    for (let step = 0; step < steps[level]; step++, n++) {
      const name = `${String(n + 1).padStart(2, '0')}-${ids[n]}`
      await page.goto(`${base}/?level=${level}&step=${step}&quality=high`, { waitUntil: 'networkidle' })
      await page.waitForSelector('body[data-camera-settled="true"]', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(1800)
      await page.screenshot({ path: `${out}/${name}-a.png` })
      const ranges = page.locator('.panel input[type=range]')
      const count = await ranges.count()
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await ranges.nth(i).evaluate((el) => {
            const input = el
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
            setter.call(input, input.max)
            input.dispatchEvent(new Event('input', { bubbles: true }))
          })
        }
        await page.waitForTimeout(2500)
        await page.screenshot({ path: `${out}/${name}-b.png` })
      }
    }
  }
} finally {
  await browser.close()
}
