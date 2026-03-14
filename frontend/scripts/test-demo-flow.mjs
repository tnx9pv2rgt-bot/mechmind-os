import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})

const page = await browser.newPage()
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', err => errors.push(`UNCAUGHT: ${err.message}`))

// Step 1: go to /auth
console.log('Step 1: Loading /auth...')
await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle2', timeout: 15000 })
await new Promise(r => setTimeout(r, 2000))
const authErrors = errors.filter(e => !e.includes('React DevTools'))
console.log('Step 1 /auth:', authErrors.length === 0 ? '✅ clean' : '❌ ' + authErrors.join(', '))
errors.length = 0

// Step 2: find the demo button and click it
console.log('Step 2: Looking for demo button...')
try {
  // Try multiple selectors for the demo button
  const demoButton = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a, button'))
    for (const el of allLinks) {
      const text = el.textContent?.toLowerCase() || ''
      if (text.includes('prova') || text.includes('demo') || text.includes('try')) {
        return { tag: el.tagName, text: el.textContent?.trim(), href: el.getAttribute('href') }
      }
    }
    return null
  })

  if (demoButton) {
    console.log(`  Found: <${demoButton.tag}> "${demoButton.text}" href="${demoButton.href}"`)

    if (demoButton.href) {
      await page.goto(`http://localhost:3000${demoButton.href}`, { waitUntil: 'networkidle2', timeout: 15000 })
    } else {
      await page.evaluate(() => {
        const allEls = Array.from(document.querySelectorAll('a, button'))
        for (const el of allEls) {
          const text = el.textContent?.toLowerCase() || ''
          if (text.includes('prova') || text.includes('demo') || text.includes('try')) {
            el.click()
            break
          }
        }
      })
      await new Promise(r => setTimeout(r, 5000))
    }

    const url = page.url()
    const step2Errors = errors.filter(e => !e.includes('React DevTools') && !e.includes('404'))
    console.log('Step 2 URL:', url)
    console.log('Step 2:', url.includes('/dashboard') ? '✅ reached dashboard' : '⚠️ at ' + url)
    console.log('Step 2 console:', step2Errors.length === 0 ? '✅ clean' : '❌ ' + step2Errors.join('\n'))
  } else {
    console.log('Step 2: ⚠️ No demo button found on /auth page')
  }
} catch(e) {
  console.log('Step 2 ❌:', e.message)
}

await browser.close()
console.log('\nDone.')
