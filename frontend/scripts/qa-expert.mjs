import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:3001'
const REPORT = []
let screenshotIdx = 0

mkdirSync('scripts/qa-screenshots', { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900 }
})

const page = await browser.newPage()

// Force light mode to avoid dark-mode rendering issues in headless Chrome
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'light' }
])

async function testPage(name, url, checks = []) {
  const errors = []
  const warnings = []
  const networkFails = []

  const onConsole = msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.type() === 'warning' && msg.text().includes('hydration')) warnings.push(msg.text())
  }
  const onPageError = err => errors.push(`UNCAUGHT: ${err.message}`)
  const onReqFailed = req => networkFails.push(`${req.failure()?.errorText} → ${req.url()}`)

  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onReqFailed)

  try {
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Wait for client hydration and network settle
    await new Promise(r => setTimeout(r, 3000))
    await new Promise(r => setTimeout(r, 1500))

    const safeName = name.replace(/[\/\s]/g, '-')
    const ssDesktop = `scripts/qa-screenshots/${++screenshotIdx}-${safeName}-desktop.png`
    await page.screenshot({ path: ssDesktop, fullPage: true })

    await page.setViewport({ width: 390, height: 844 })
    await new Promise(r => setTimeout(r, 500))
    const ssMobile = `scripts/qa-screenshots/${screenshotIdx}-${safeName}-mobile.png`
    await page.screenshot({ path: ssMobile, fullPage: true })
    await page.setViewport({ width: 1440, height: 900 })

    const checkResults = []
    for (const check of checks) {
      try {
        checkResults.push(await check(page))
      } catch(e) {
        checkResults.push({ ok: false, msg: e.message })
      }
    }

    // Filter out browser-level noise and Next.js dev-mode artifacts
    const filteredErrors = errors.filter(e => {
      if (e.includes('DevTools') || e.includes('React DevTools')) return false
      if (e.includes('MIME type')) return false
      if (e.includes('Failed to load resource')) return false
      if (e.includes('Refused to apply style')) return false
      if (e.includes('Refused to execute script')) return false
      if (e.includes('[HMR]') || e.includes('hot-reloader')) return false
      if (e.includes('net::ERR_')) return false
      return true
    })
    const result = {
      page: name, url,
      finalUrl: page.url(),
      redirected: page.url() !== `${BASE}${url}`,
      consoleErrors: filteredErrors,
      hydrationWarnings: warnings,
      networkFails: networkFails.filter(f => !f.includes('favicon')),
      checks: checkResults,
      clean: filteredErrors.length === 0,
      screenshots: { desktop: ssDesktop, mobile: ssMobile }
    }
    REPORT.push(result)
    console.log(`  ${result.clean ? '✅' : '🔴'} ${name} (${filteredErrors.length} err)`)
    return result
  } catch(e) {
    const result = { page: name, url, error: e.message, clean: false }
    REPORT.push(result)
    console.log(`  ❌ ${name}: ${e.message.substring(0, 80)}`)
    return result
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
    page.off('requestfailed', onReqFailed)
  }
}

// ============================================================
// TEST 1 — AUTH PAGE
// ============================================================
console.log('\n🧪 Test 1: Auth page')
await testPage('auth', '/auth', [
  async p => {
    const form = await p.$('input[type="email"], input[type="text"]')
    return { ok: !!form, msg: form ? '✅ Input email presente' : '❌ Input email mancante' }
  },
  async p => {
    const hasDemo = await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button'))
      return els.some(el => (el.textContent?.toLowerCase() || '').match(/prova|demo|try/))
    })
    return { ok: hasDemo, msg: hasDemo ? '✅ Demo button presente' : '❌ Demo button mancante' }
  },
  async p => {
    const hasLoginRegister = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const hasAccedi = btns.some(b => b.textContent?.includes('Accedi'))
      const hasRegistrati = btns.some(b => b.textContent?.includes('Registrati'))
      return hasAccedi && hasRegistrati
    })
    return { ok: hasLoginRegister, msg: hasLoginRegister ? '✅ Login + Register buttons' : '⚠️ Missing login/register buttons' }
  }
])

// ============================================================
// TEST 2 — DEMO FLOW
// ============================================================
console.log('\n🧪 Test 2: Demo flow')
{
  const errors = []
  const rawErrors = []
  const onC = msg => { if (msg.type() === 'error') rawErrors.push(msg.text()) }
  const onP = err => rawErrors.push(`UNCAUGHT: ${err.message}`)
  page.on('console', onC)
  page.on('pageerror', onP)
  try {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))
    const clicked = await page.evaluate(() => {
      for (const el of document.querySelectorAll('a, button')) {
        if ((el.textContent?.toLowerCase() || '').match(/prova|demo|try/)) { el.click(); return true }
      }
      return false
    })
    if (clicked) {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 3000))
    }
    const finalUrl = page.url()
    const ok = finalUrl.includes('/dashboard') || finalUrl.includes('/demo')
    await page.screenshot({ path: `scripts/qa-screenshots/${++screenshotIdx}-demo-flow.png`, fullPage: true })
    const errors = rawErrors.filter(e => !e.includes('DevTools') && !e.includes('MIME type') && !e.includes('Failed to load resource') && !e.includes('Refused to') && !e.includes('net::ERR_'))
    REPORT.push({
      page: 'FLUSSO DEMO', url: '/auth → dashboard', finalUrl, clean: ok && errors.length === 0,
      consoleErrors: errors,
      checks: [
        { ok, msg: ok ? `✅ → ${finalUrl}` : `❌ Rimasto su ${finalUrl}` },
        { ok: errors.length === 0, msg: errors.length === 0 ? '✅ Console pulita' : `❌ ${errors.length} errori` }
      ]
    })
    console.log(`  ${ok ? '✅' : '❌'} Demo → ${finalUrl}`)
  } catch(e) {
    REPORT.push({ page: 'FLUSSO DEMO', url: '/auth → dashboard', error: e.message, clean: false })
    console.log(`  ❌ ${e.message.substring(0, 80)}`)
  } finally {
    page.off('console', onC)
    page.off('pageerror', onP)
  }
}

// ============================================================
// TEST 3 — FORGOT PASSWORD
// ============================================================
console.log('\n🧪 Test 3: Forgot password')
await testPage('forgot-password', '/auth/forgot-password', [
  async p => {
    const input = await p.$('input[type="email"]')
    return { ok: !!input, msg: input ? '✅ Input email' : '❌ Input email mancante' }
  }
])

// ============================================================
// TEST 4 — PORTAL PAGES
// ============================================================
console.log('\n🧪 Test 4: Portal')
for (const [n, u] of [
  ['portal-login', '/portal/login'],
  ['portal-register', '/portal/register'],
  ['portal-reset', '/portal/reset-password'],
]) await testPage(n, u)

// ============================================================
// TEST 5 — BILLING
// ============================================================
console.log('\n🧪 Test 5: Billing')
for (const [n, u] of [
  ['billing-success', '/billing/success'],
  ['billing-cancel', '/billing/cancel'],
]) await testPage(n, u)

// ============================================================
// TEST 6 — DASHBOARD PAGES
// ============================================================
console.log('\n🧪 Test 6: Dashboard pages')
for (const [n, u] of [
  ['dashboard', '/dashboard'],
  ['bookings', '/dashboard/bookings'],
  ['customers', '/dashboard/customers'],
  ['vehicles', '/dashboard/vehicles'],
  ['parts', '/dashboard/parts'],
  ['invoices', '/dashboard/invoices'],
  ['analytics', '/dashboard/analytics'],
  ['settings', '/dashboard/settings'],
  ['inspections', '/dashboard/inspections'],
  ['inspections-new', '/dashboard/inspections/new'],
  ['obd', '/dashboard/obd'],
  ['warranty', '/dashboard/warranty'],
  ['billing-dash', '/dashboard/billing'],
  ['subscription', '/dashboard/subscription'],
  ['locations', '/dashboard/locations'],
  ['admin-subs', '/dashboard/admin/subscriptions'],
]) await testPage(n, u)

// ============================================================
// TEST 7 — PORTAL AUTH PAGES
// ============================================================
console.log('\n🧪 Test 7: Portal auth pages')
for (const [n, u] of [
  ['portal-dash', '/portal/dashboard'],
  ['portal-bookings', '/portal/bookings'],
  ['portal-bookings-new', '/portal/bookings/new'],
  ['portal-docs', '/portal/documents'],
  ['portal-inspect', '/portal/inspections'],
  ['portal-maint', '/portal/maintenance'],
  ['portal-settings', '/portal/settings'],
  ['portal-warranty', '/portal/warranty'],
]) await testPage(n, u)

// ============================================================
// TEST 8 — MOBILE
// ============================================================
console.log('\n🧪 Test 8: Mobile')
{
  const rawErrors = []
  const onC = msg => { if (msg.type() === 'error') rawErrors.push(msg.text()) }
  page.on('console', onC)
  try {
    await page.setViewport({ width: 390, height: 844 })
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({ path: `scripts/qa-screenshots/${++screenshotIdx}-mobile-auth.png`, fullPage: true })
    const errors = rawErrors.filter(e => !e.includes('DevTools') && !e.includes('MIME type') && !e.includes('Failed to load resource') && !e.includes('Refused to') && !e.includes('net::ERR_'))
    REPORT.push({
      page: 'MOBILE /auth', url: '/auth', clean: errors.length === 0, consoleErrors: errors,
      checks: [{ ok: errors.length === 0, msg: errors.length === 0 ? '✅ Console pulita' : `❌ ${errors.length} errori` }]
    })
    console.log(`  ${errors.length === 0 ? '✅' : '🔴'} Mobile auth`)
  } catch(e) {
    REPORT.push({ page: 'MOBILE /auth', url: '/auth', error: e.message, clean: false })
    console.log(`  ❌ ${e.message.substring(0, 80)}`)
  } finally {
    page.off('console', onC)
    await page.setViewport({ width: 1440, height: 900 })
  }
}

// ============================================================
// TEST 9 — DEMO + CUSTOMER FLOW + 404
// ============================================================
console.log('\n🧪 Test 9: Other pages')
await testPage('demo', '/demo')
for (const [n, u] of [
  ['cust-landing', '/dashboard/customers/new/landing'],
  ['cust-new', '/dashboard/customers/new'],
  ['cust-step1', '/dashboard/customers/new/step1'],
  ['cust-step2', '/dashboard/customers/new/step2'],
  ['cust-step3', '/dashboard/customers/new/step3'],
  ['cust-step4', '/dashboard/customers/new/step4'],
]) await testPage(n, u)
await testPage('404', '/this-does-not-exist')

// ============================================================
// REPORT
// ============================================================
writeFileSync('scripts/qa-report.json', JSON.stringify(REPORT, null, 2))

console.log('\n╔═══════════════════════════════════════════╗')
console.log('║         QA EXPERT REPORT — MechMind OS    ║')
console.log('╚═══════════════════════════════════════════╝\n')

let passed = 0, failed = 0, warnings = 0
for (const r of REPORT) {
  if (r.error) {
    console.log(`❌ CRASH   ${r.page}: ${r.error.substring(0, 100)}`)
    failed++
  } else if (!r.clean) {
    console.log(`🔴 ERRORI  ${r.page} (${r.url})`)
    r.consoleErrors?.forEach(e => console.log(`   └─ ${e.substring(0, 150)}`))
    r.checks?.forEach(c => !c.ok && console.log(`   └─ ${c.msg}`))
    failed++
  } else {
    const hasWarn = r.checks?.some(c => c.msg?.includes('⚠️'))
    if (hasWarn) {
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
console.log(`\nScreenshot: scripts/qa-screenshots/`)
console.log(`Report: scripts/qa-report.json\n`)

await page.close()
await browser.close()
