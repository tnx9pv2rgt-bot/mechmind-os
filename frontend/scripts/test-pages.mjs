import puppeteer from 'puppeteer'
import { writeFileSync } from 'fs'

const BASE = 'http://localhost:3000'

const PAGES = [
  // Auth
  '/auth',
  '/auth/forgot-password',
  '/auth/magic-link/verify',
  '/auth/mfa/setup',
  '/auth/mfa/verify',
  // Portal (no auth needed to load)
  '/portal',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
  // Billing
  '/billing/cancel',
  '/billing/success',
  // Root
  '/',
  // Dashboard (expect redirect to /auth)
  '/dashboard',
  '/dashboard/analytics',
  '/dashboard/billing',
  '/dashboard/bookings',
  '/dashboard/bookings/new',
  '/dashboard/customers',
  '/dashboard/customers/new',
  '/dashboard/customers/new/landing',
  '/dashboard/customers/new/step1',
  '/dashboard/customers/new/step2',
  '/dashboard/customers/new/step3',
  '/dashboard/customers/new/step4',
  '/dashboard/inspections',
  '/dashboard/inspections/new',
  '/dashboard/invoices',
  '/dashboard/invoices/financial',
  '/dashboard/invoices/quotes',
  '/dashboard/locations',
  '/dashboard/maintenance',
  '/dashboard/obd',
  '/dashboard/parts',
  '/dashboard/settings',
  '/dashboard/subscription',
  '/dashboard/vehicles',
  '/dashboard/vehicles/new',
  '/dashboard/warranty',
  '/dashboard/warranty/claims',
  '/dashboard/admin/subscriptions',
  // Portal authenticated
  '/portal/dashboard',
  '/portal/bookings',
  '/portal/bookings/new',
  '/portal/documents',
  '/portal/inspections',
  '/portal/maintenance',
  '/portal/settings',
  '/portal/warranty',
]

const results = {}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})

for (const path of PAGES) {
  const page = await browser.newPage()
  const errors = []
  const warnings = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.type() === 'warning') warnings.push(msg.text())
  })

  page.on('pageerror', err => errors.push(`UNCAUGHT: ${err.message}`))

  try {
    const res = await page.goto(`${BASE}${path}`, {
      waitUntil: 'networkidle2',
      timeout: 15000
    })

    await new Promise(r => setTimeout(r, 2000))

    const finalUrl = page.url()
    const redirected = !finalUrl.includes(path)

    results[path] = {
      status: res?.status(),
      finalUrl: redirected ? finalUrl : null,
      redirected,
      errors: errors.filter(e => !e.includes('React DevTools')),
      warnings: warnings.filter(w =>
        w.includes('hydration') ||
        w.includes('undefined') ||
        w.includes('Warning:')
      ),
      clean: errors.filter(e => !e.includes('React DevTools')).length === 0
    }
  } catch (e) {
    results[path] = { error: e.message, clean: false }
  }

  await page.close()
}

await browser.close()

writeFileSync('scripts/test-results.json', JSON.stringify(results, null, 2))

console.log('\n=== RISULTATI TEST PAGINE ===\n')
let clean = 0, broken = 0

for (const [path, r] of Object.entries(results)) {
  if (r.error) {
    console.log(`CRASH  ${path} — ${r.error}`)
    broken++
  } else if (r.clean) {
    if (r.redirected) {
      console.log(`REDIR  ${path} -> ${r.finalUrl}`)
    } else {
      console.log(`CLEAN  ${path}`)
    }
    clean++
  } else {
    console.log(`ERROR  ${path}`)
    r.errors.forEach(e => console.log(`   > ${e.substring(0, 200)}`))
    broken++
  }
}

console.log(`\n=== TOTALE: ${clean} pulite, ${broken} con errori ===\n`)
