import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

mkdirSync('scripts/visual-baseline', { recursive: true })

const BASE = 'http://localhost:3001'
const PAGES = [
  '/auth', '/auth/forgot-password',
  '/portal/login', '/portal/register', '/portal/reset-password',
  '/billing/success', '/billing/cancel',
  '/terms', '/privacy', '/',
]

const browser = await chromium.launch()

for (const path of PAGES) {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1000))

    const name = path === '/' ? 'root' : path.replace(/\//g, '-').slice(1)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({ path: `scripts/visual-baseline/${name}-desktop.png`, fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `scripts/visual-baseline/${name}-mobile.png`, fullPage: true })

    console.log(`✅ Baseline: ${name} (desktop + mobile)`)
  } catch (err) {
    console.log(`⚠️ Skip: ${path} — ${err.message.substring(0, 80)}`)
  }

  await page.close()
  await context.close()
}

await browser.close()
console.log('\n✅ Visual regression baseline creata.')
