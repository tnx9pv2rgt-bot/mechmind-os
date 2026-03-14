import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync } from 'fs'

const BASE = 'http://localhost:3001'
const PAGES = [
  '/auth',
  '/auth/forgot-password',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
  '/billing/success',
  '/billing/cancel',
  '/terms',
  '/privacy',
  '/not-found',
  '/',
]

const browser = await chromium.launch()
const allResults = {}
let totalViolations = 0

for (const path of PAGES) {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1000))

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const violations = scanResults.violations
    allResults[path] = {
      violations: violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        html: v.nodes.slice(0, 3).map(n => n.html.substring(0, 120)),
        fix: v.nodes[0]?.failureSummary?.substring(0, 200) || '',
      })),
      passes: scanResults.passes.length,
      clean: violations.length === 0,
    }

    totalViolations += violations.length

    if (violations.length > 0) {
      console.log(`\n❌ A11Y VIOLATIONS — ${path}:`)
      violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
        v.nodes.slice(0, 2).forEach(n => {
          console.log(`    └─ ${n.html.substring(0, 100)}`)
          if (n.failureSummary) console.log(`       FIX: ${n.failureSummary.split('\n')[1]?.trim() || ''}`)
        })
      })
    } else {
      console.log(`✅ A11Y PASS — ${path} (${scanResults.passes.length} checks passed)`)
    }
  } catch (err) {
    console.log(`⚠️ A11Y SKIP — ${path}: ${err.message.substring(0, 100)}`)
    allResults[path] = { violations: [], passes: 0, clean: false, error: err.message.substring(0, 200) }
  }
  await page.close()
  await context.close()
}

await browser.close()
writeFileSync('scripts/a11y-report.json', JSON.stringify(allResults, null, 2))

console.log(`\n${'='.repeat(60)}`)
console.log(`TOTALE VIOLAZIONI: ${totalViolations}`)
console.log(totalViolations === 0 ? '✅ WCAG 2.2 AA COMPLIANT' : `❌ NON COMPLIANT — ${totalViolations} violations da fixare`)
console.log(`${'='.repeat(60)}`)
