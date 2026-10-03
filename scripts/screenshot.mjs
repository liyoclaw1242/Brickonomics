import { chromium } from 'playwright'

const [url = 'http://localhost:5173/', out = '.superpowers/sdd/shots/shot.png', w = '1280', h = '800', wait = '2000'] =
  process.argv.slice(2)

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: out })
await browser.close()
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
console.log(`saved ${out}`)
