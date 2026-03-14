import { chromium, firefox, webkit } from 'playwright'

const BASE = 'http://localhost:3001'
const CRITICAL_PAGES = ['/auth', '/', '/portal/login', '/portal/register', '/billing/success']

const NOISE = ['favicon', 'hot-update', '_next/static', 'webpack', 'ERR_ABORTED', 'net::ERR_']

function isNoise(text) {
  return NOISE.some(n => text.includes(n))
}

const results = {}

for (const [name, browserType] of [['Chromium', chromium], ['Firefox', firefox], ['WebKit', webkit]]) {
  const browser = await browserType.launch()
  const errors = []

  for (const path of CRITICAL_PAGES) {
    const context = await browser.newContext()
    const page = await context.newPage()

    page.on('console', msg => {
      if (msg.type() === 'error' && !isNoise(msg.text())) {
        errors.push(`${path}: ${msg.text().substring(0, 150)}`)
      }
    })
    page.on('pageerror', err => {
      if (!isNoise(err.message)) {
        errors.push(`${path}: UNCAUGHT: ${err.message.substring(0, 150)}`)
      }
    })

    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      errors.push(`${path}: NAVIGATION: ${err.message.substring(0, 100)}`)
    }

    await page.close()
    await context.close()
  }

  results[name] = { errors: errors.length, details: errors }
  console.log(`${name}: ${errors.length === 0 ? '✅ PASS' : '❌ ' + errors.length + ' errori'}`)
  errors.forEach(e => console.log(`  └─ ${e}`))
  await browser.close()
}

const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0)
console.log(`\n=== CROSS-BROWSER: ${totalErrors === 0 ? '✅ PASS' : '❌ ' + totalErrors + ' errori totali'} ===`)
