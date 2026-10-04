// 使用者測試截圖：每一步拍「剛進來」，有拉桿的步驟再拍「拉到底之後」
// 用法：node scripts/usertest-shots.mjs [base] [out] [w] [h] [route]
//   route＝simple|full（選填）：只拍那條路線的步驟，檔名照路線順序編號；不填＝全部步驟（完整版）
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [base = 'http://localhost:5173', out = '.superpowers/usertest/r1', w = '1280', h = '800', route] = process.argv.slice(2)
if (route !== undefined && route !== 'simple' && route !== 'full') throw new Error(`unknown route ${route}（simple 或 full）`)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
  await page.goto(`${base}/?quality=high&route=${route ?? 'full'}`, { waitUntil: 'networkidle' })
  const steps = await page.evaluate(() => window.__BCI_STEPS__)
  const ids = await page.evaluate(() => window.__BCI_STEP_IDS__)
  const routes = await page.evaluate(() => window.__BCI_ROUTES__)
  // 每一步的絕對位置
  const all = []
  for (let level = 0, n = 0; level < steps.length; level++) for (let step = 0; step < steps[level]; step++, n++) all.push({ id: ids[n], level, step })
  const keep = route && routes[route] ? all.filter((s) => routes[route].includes(s.id)) : all
  const q = route ? `&route=${route}` : ''
  for (const [i, { id, level, step }] of keep.entries()) {
    const name = `${String(i + 1).padStart(2, '0')}-${id}`
    await page.goto(`${base}/?level=${level}&step=${step}&quality=high${q}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('body[data-camera-settled="true"]', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${out}/${name}-a.png` })
    const ranges = page.locator('.panel input[type=range]')
    const count = await ranges.count()
    if (count > 0) {
      for (let r = 0; r < count; r++) {
        await ranges.nth(r).evaluate((el) => {
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
} finally {
  await browser.close()
}
