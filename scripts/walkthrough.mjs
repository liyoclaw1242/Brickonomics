import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [base = 'http://localhost:5174', out = '.superpowers/sdd/shots/walk', w = '1280', h = '800'] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/?quality=high`, { waitUntil: 'networkidle' })
  const steps = await page.evaluate(() => window.__BCI_STEPS__)
  for (let level = 0; level < steps.length; level++) {
    for (let step = 0; step < steps[level]; step++) {
      await page.goto(`${base}/?level=${level}&step=${step}&quality=high`, { waitUntil: 'networkidle' })
      await page.waitForSelector('body[data-camera-seq]', { timeout: 15000 }).catch(() => {})
      await page
        .waitForSelector('body[data-camera-settled="true"]', { timeout: 15000 })
        .catch(() => page.waitForTimeout(3500))
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${out}/L${level}-S${step}.png` })
    }
  }
} finally {
  await browser.close()
}
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
console.log(`saved walkthrough to ${out}`)
