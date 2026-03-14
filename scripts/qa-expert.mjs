import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const REPORT = []
let screenshotIdx = 0

mkdirSync('scripts/qa-screenshots', { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1440, height: 900 }
})

async function testPage(page, name, url, checks = []) {
  const errors = []
  const warnings = []
  const networkFails = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.type() === 'warning' && msg.text().includes('hydration')) warnings.push(msg.text())
  })
  page.on('pageerror', err => errors.push(`UNCAUGHT: ${err.message}`))
  page.on('requestfailed', req => networkFails.push(`${req.failure()?.errorText} → ${req.url()}`))

  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))

    // Screenshot desktop
    const ssPath = `scripts/qa-screenshots/${++screenshotIdx}-${name.replace(/\//g, '-')}-desktop.png`
    await page.screenshot({ path: ssPath, fullPage: true })

    // Screenshot mobile
    await page.setViewport({ width: 390, height: 844 })
    await new Promise(r => setTimeout(r, 500))
    const ssMobile = `scripts/qa-screenshots/${screenshotIdx}-${name.replace(/\//g, '-')}-mobile.png`
    await page.screenshot({ path: ssMobile, fullPage: true })
    await page.setViewport({ width: 1440, height: 900 })

    // Esegui check custom
    const checkResults = []
    for (const check of checks) {
      try {
        const result = await check(page)
        checkResults.push(result)
      } catch(e) {
        checkResults.push({ ok: false, msg: e.message })
      }
    }

    const filteredErrors = errors.filter(e => !e.includes('DevTools') && !e.includes('React DevTools'))
    const result = {
      page: name,
      url,
      finalUrl: page.url(),
      redirected: page.url() !== `${BASE}${url}`,
      consoleErrors: filteredErrors,
      hydrationWarnings: warnings,
      networkFails,
      checks: checkResults,
      clean: filteredErrors.length === 0,
      screenshots: { desktop: ssPath, mobile: ssMobile }
    }

    REPORT.push(result)
    return result
  } catch(e) {
    const result = { page: name, url, error: e.message, clean: false }
    REPORT.push(result)
    return result
  }
}

// Helper to find element by text content
async function findByText(page, text, selector = 'a, button, span') {
  return page.evaluateHandle((text, selector) => {
    const els = Array.from(document.querySelectorAll(selector))
    return els.find(el => el.textContent?.toLowerCase().includes(text.toLowerCase())) || null
  }, text, selector)
}

// ============================================================
// TEST 1 — PAGINA AUTH
// ============================================================
console.log('🧪 Test 1: Auth page...')
{
  const page = await browser.newPage()
  await testPage(page, 'auth', '/auth', [
    async p => {
      const form = await p.$('input[type="email"], input[type="text"]')
      return { ok: !!form, msg: form ? '✅ Input email presente' : '❌ Input email mancante' }
    },
    async p => {
      const hasDemo = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button'))
        return els.some(el => {
          const text = el.textContent?.toLowerCase() || ''
          return text.includes('prova') || text.includes('demo') || text.includes('try')
        })
      })
      return { ok: hasDemo, msg: hasDemo ? '✅ "Prima provalo" presente' : '❌ "Prima provalo" mancante' }
    },
    async p => {
      const tabCount = await p.evaluate(() => document.querySelectorAll('[role="tab"]').length)
      return { ok: tabCount >= 2, msg: tabCount >= 2 ? `✅ ${tabCount} tab trovati` : `❌ Solo ${tabCount} tab` }
    }
  ])
  await page.close()
}

// ============================================================
// TEST 2 — FLUSSO DEMO COMPLETO
// ============================================================
console.log('🧪 Test 2: Demo flow...')
{
  const page = await browser.newPage()
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('DevTools')) errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(`UNCAUGHT: ${err.message}`))

  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2', timeout: 15000 })
  await new Promise(r => setTimeout(r, 2000))

  // Click "Prima provalo" or demo button
  try {
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button'))
      for (const el of els) {
        const text = el.textContent?.toLowerCase() || ''
        if (text.includes('prova') || text.includes('demo') || text.includes('try')) {
          el.click()
          return true
        }
      }
      return false
    })
    if (clicked) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 3000))
    }
  } catch(e) {
    console.log('  Demo click error:', e.message)
  }

  const isDashboard = page.url().includes('/dashboard') || page.url().includes('/demo')
  await page.screenshot({ path: `scripts/qa-screenshots/${++screenshotIdx}-demo-flow-result.png`, fullPage: true })

  REPORT.push({
    page: 'FLUSSO DEMO',
    url: '/auth → /dashboard',
    finalUrl: page.url(),
    clean: isDashboard && errors.length === 0,
    consoleErrors: errors,
    checks: [
      { ok: isDashboard, msg: isDashboard ? '✅ Redirect a dashboard riuscito' : `❌ Rimasto su ${page.url()}` },
      { ok: errors.length === 0, msg: errors.length === 0 ? '✅ Console pulita' : `❌ ${errors.length} errori` }
    ]
  })

  // Navigate menu items (only if on dashboard)
  if (isDashboard || page.url().includes('/demo')) {
    const menuItems = [
      ['Prenotazioni', '/bookings'],
      ['Clienti', '/customers'],
      ['Veicoli', '/vehicles'],
      ['Ricambi', '/parts'],
      ['Fatture', '/invoices'],
      ['Analytics', '/analytics'],
      ['Impostazioni', '/settings'],
    ]

    for (const [label, expectedPath] of menuItems) {
      const menuErrors = []
      page.removeAllListeners('console')
      page.removeAllListeners('pageerror')
      page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('DevTools')) menuErrors.push(msg.text()) })
      page.on('pageerror', err => menuErrors.push(`UNCAUGHT: ${err.message}`))

      try {
        const clicked = await page.evaluate((label) => {
          const els = Array.from(document.querySelectorAll('a, button, span, div'))
          for (const el of els) {
            if (el.textContent?.trim() === label || el.textContent?.trim().includes(label)) {
              el.click()
              return true
            }
          }
          return false
        }, label)

        if (clicked) {
          await new Promise(r => setTimeout(r, 2500))
          await page.screenshot({ path: `scripts/qa-screenshots/${++screenshotIdx}-menu-${label}.png` })

          REPORT.push({
            page: `Menu → ${label}`,
            url: expectedPath,
            finalUrl: page.url(),
            clean: menuErrors.length === 0,
            consoleErrors: menuErrors,
            checks: [
              { ok: page.url().includes(expectedPath), msg: page.url().includes(expectedPath) ? `✅ Navigato a ${expectedPath}` : `⚠️ Su ${page.url()}` },
              { ok: menuErrors.length === 0, msg: menuErrors.length === 0 ? '✅ Console pulita' : `❌ ${menuErrors.join(', ')}` }
            ]
          })
        } else {
          REPORT.push({ page: `Menu → ${label}`, url: expectedPath, clean: true, checks: [{ ok: false, msg: `⚠️ Link "${label}" non trovato nel menu` }] })
        }
      } catch(e) {
        REPORT.push({ page: `Menu → ${label}`, error: e.message, clean: false })
      }
    }
  }

  await page.close()
}

// ============================================================
// TEST 3 — AUTH FORGOT PASSWORD
// ============================================================
console.log('🧪 Test 3: Forgot password...')
{
  const page = await browser.newPage()
  await testPage(page, 'auth-forgot-password', '/auth/forgot-password', [
    async p => {
      const input = await p.$('input[type="email"]')
      return { ok: !!input, msg: input ? '✅ Input email presente' : '❌ Input email mancante' }
    }
  ])
  await page.close()
}

// ============================================================
// TEST 4 — PORTAL PUBBLICO
// ============================================================
console.log('🧪 Test 4: Portal pages...')
for (const [name, url] of [
  ['portal-login', '/portal/login'],
  ['portal-register', '/portal/register'],
  ['portal-reset', '/portal/reset-password'],
]) {
  const page = await browser.newPage()
  await testPage(page, name, url)
  await page.close()
}

// ============================================================
// TEST 5 — BILLING
// ============================================================
console.log('🧪 Test 5: Billing pages...')
for (const [name, url] of [
  ['billing-success', '/billing/success'],
  ['billing-cancel', '/billing/cancel'],
]) {
  const page = await browser.newPage()
  await testPage(page, name, url)
  await page.close()
}

// ============================================================
// TEST 6 — ALL DASHBOARD PAGES (direct access)
// ============================================================
console.log('🧪 Test 6: Dashboard pages (direct)...')
const dashPages = [
  ['dashboard-main', '/dashboard'],
  ['dashboard-bookings', '/dashboard/bookings'],
  ['dashboard-customers', '/dashboard/customers'],
  ['dashboard-vehicles', '/dashboard/vehicles'],
  ['dashboard-parts', '/dashboard/parts'],
  ['dashboard-invoices', '/dashboard/invoices'],
  ['dashboard-analytics', '/dashboard/analytics'],
  ['dashboard-settings', '/dashboard/settings'],
  ['dashboard-inspections', '/dashboard/inspections'],
  ['dashboard-obd', '/dashboard/obd'],
  ['dashboard-warranty', '/dashboard/warranty'],
  ['dashboard-billing', '/dashboard/billing'],
  ['dashboard-subscription', '/dashboard/subscription'],
  ['dashboard-locations', '/dashboard/locations'],
  ['dashboard-admin-subs', '/dashboard/admin/subscriptions'],
]

for (const [name, url] of dashPages) {
  const page = await browser.newPage()
  await testPage(page, name, url)
  await page.close()
}

// ============================================================
// TEST 7 — PORTAL AUTHENTICATED PAGES
// ============================================================
console.log('🧪 Test 7: Portal authenticated pages...')
for (const [name, url] of [
  ['portal-dashboard', '/portal/dashboard'],
  ['portal-bookings', '/portal/bookings'],
  ['portal-bookings-new', '/portal/bookings/new'],
  ['portal-documents', '/portal/documents'],
  ['portal-inspections', '/portal/inspections'],
  ['portal-maintenance', '/portal/maintenance'],
  ['portal-settings', '/portal/settings'],
  ['portal-warranty', '/portal/warranty'],
]) {
  const page = await browser.newPage()
  await testPage(page, name, url)
  await page.close()
}

// ============================================================
// TEST 8 — MOBILE CRITICAL FLOW
// ============================================================
console.log('🧪 Test 8: Mobile flow...')
{
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('DevTools')) errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(`UNCAUGHT: ${err.message}`))

  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2', timeout: 15000 })
  await new Promise(r => setTimeout(r, 2000))
  await page.screenshot({ path: `scripts/qa-screenshots/${++screenshotIdx}-mobile-auth.png`, fullPage: true })

  const hamburger = await page.$('[aria-label="menu"], button[class*="hamburger"], button[class*="mobile"]')

  REPORT.push({
    page: 'MOBILE /auth',
    url: '/auth',
    clean: errors.length === 0,
    consoleErrors: errors,
    checks: [
      { ok: errors.length === 0, msg: errors.length === 0 ? '✅ Console pulita' : `❌ ${errors.length} errori` },
      { ok: true, msg: hamburger ? '✅ Hamburger menu presente' : '⚠️ Hamburger menu non trovato' }
    ]
  })
  await page.close()
}

// ============================================================
// TEST 9 — DEMO PAGE DIRECT
// ============================================================
console.log('🧪 Test 9: Demo page...')
{
  const page = await browser.newPage()
  await testPage(page, 'demo', '/demo')
  await page.close()
}

// ============================================================
// TEST 10 — CUSTOMER NEW FLOW STEPS
// ============================================================
console.log('🧪 Test 10: Customer new flow...')
for (const [name, url] of [
  ['customer-new-landing', '/dashboard/customers/new/landing'],
  ['customer-new', '/dashboard/customers/new'],
  ['customer-step1', '/dashboard/customers/new/step1'],
  ['customer-step2', '/dashboard/customers/new/step2'],
  ['customer-step3', '/dashboard/customers/new/step3'],
  ['customer-step4', '/dashboard/customers/new/step4'],
]) {
  const page = await browser.newPage()
  await testPage(page, name, url)
  await page.close()
}

// ============================================================
// TEST 11 — NOT FOUND PAGE
// ============================================================
console.log('🧪 Test 11: 404 page...')
{
  const page = await browser.newPage()
  await testPage(page, '404-page', '/this-does-not-exist')
  await page.close()
}

// ============================================================
// SALVA REPORT E STAMPA SOMMARIO
// ============================================================
writeFileSync('scripts/qa-report.json', JSON.stringify(REPORT, null, 2))

console.log('\n╔═══════════════════════════════════════════╗')
console.log('║         QA EXPERT REPORT — MechMind OS    ║')
console.log('╚═══════════════════════════════════════════╝\n')

let passed = 0, failed = 0, warnings = 0

for (const r of REPORT) {
  if (r.error) {
    console.log(`❌ CRASH   ${r.page}: ${r.error}`)
    failed++
  } else if (!r.clean) {
    console.log(`🔴 ERRORI  ${r.page} (${r.url})`)
    r.consoleErrors?.forEach(e => console.log(`   └─ ${e.substring(0, 150)}`))
    r.checks?.forEach(c => !c.ok && console.log(`   └─ ${c.msg}`))
    failed++
  } else {
    const hasWarnings = r.checks?.some(c => c.msg?.includes('⚠️'))
    if (hasWarnings) {
      console.log(`⚠️  WARN   ${r.page}`)
      r.checks?.filter(c => c.msg?.includes('⚠️')).forEach(c => console.log(`   └─ ${c.msg}`))
      warnings++
    } else {
      console.log(`✅ PASS    ${r.page}`)
      passed++
    }
  }
}

console.log(`\n╔═══════════════════════════════════════════╗`)
console.log(`║  PASS: ${String(passed).padEnd(3)} |  WARN: ${String(warnings).padEnd(3)} |  FAIL: ${String(failed).padEnd(3)}     ║`)
console.log(`╚═══════════════════════════════════════════╝`)
console.log(`\nScreenshot salvati in: scripts/qa-screenshots/`)
console.log(`Report completo: scripts/qa-report.json\n`)

await browser.close()
