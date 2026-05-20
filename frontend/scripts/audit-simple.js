const { chromium } = require('playwright');
const fs = require('fs');

const SECTORS = ['Meccanica generale', 'Carrozzeria', 'Gommista'];
const BASE_URL = 'http://localhost:3000';

async function auditSector(sector) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const steps = [];

  try {
    // Step 1
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const step1Title = await page.locator('h2').first().textContent();
    steps.push({
      stepNumber: 1,
      title: step1Title?.trim() || 'Step 1',
    });

    // Fill and continue
    await page.locator('#shop-name').fill('Test Shop');
    await page.waitForTimeout(200);

    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text?.includes('Continua')) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(800);

    // Step 2 - Sector selection
    const step2Title = await page.locator('h2').first().textContent();
    steps.push({
      stepNumber: 2,
      title: step2Title?.trim() || 'Step 2',
    });

    const sectorBtn = page
      .locator(`button:has(text="${sector}"), div:has(text="${sector}")`)
      .first();
    if (await sectorBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sectorBtn.click();
    } else {
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text?.includes(sector)) {
          await btn.click();
          break;
        }
      }
    }

    await page.waitForTimeout(500);

    const buttons2 = await page.locator('button').all();
    for (const btn of buttons2) {
      const text = await btn.textContent();
      if (text?.includes('Continua')) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(800);

    // Step 3 - Team size
    const step3Title = await page.locator('h2').first().textContent();
    steps.push({
      stepNumber: 3,
      title: step3Title?.trim() || 'Step 3',
    });

    const allOptions = await page.locator('button').all();
    for (const opt of allOptions) {
      const text = await opt.textContent();
      if (text && !text.includes('Salta') && !text.includes('×') && text.length > 3) {
        await opt.click();
        break;
      }
    }

    await page.waitForTimeout(500);

    const buttons3 = await page.locator('button').all();
    for (const btn of buttons3) {
      const text = await btn.textContent();
      if (text?.includes('Continua')) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(800);

    // Step 4 - Priority
    const step4Title = await page.locator('h2').first().textContent();
    steps.push({
      stepNumber: 4,
      title: step4Title?.trim() || 'Step 4',
    });

    const allPriority = await page.locator('button').all();
    for (const opt of allPriority) {
      const text = await opt.textContent();
      if (text && !text.includes('Salta') && !text.includes('×') && text.length > 3) {
        await opt.click();
        break;
      }
    }

    await page.waitForTimeout(500);

    const allBtns = await page.locator('button').all();
    let finalUrl = page.url();
    for (const btn of allBtns) {
      const text = await btn.textContent();
      if (text?.includes('pannello') || text?.includes('Dashboard')) {
        await btn.click();
        await page.waitForTimeout(1500);
        finalUrl = page.url();
        break;
      }
    }

    await context.close();
    await browser.close();

    return {
      sector,
      steps,
      finalUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

async function main() {
  const results = [];

  for (const sector of SECTORS) {
    try {
      const result = await auditSector(sector);
      results.push(result);
    } catch (err) {
      results.push({
        sector,
        error: err.message,
        steps: [],
        finalUrl: '',
        timestamp: new Date().toISOString(),
      });
    }
  }

  let summary = 'ONBOARDING AUDIT — 3 SECTORS\n';
  summary += '============================\n\n';

  results.forEach((result, idx) => {
    summary += `${idx + 1}. ${result.sector.toUpperCase()}\n`;
    summary += '─'.repeat(40) + '\n';

    if (result.error) {
      summary += `ERROR: ${result.error}\n\n`;
      return;
    }

    result.steps.forEach(step => {
      summary += `  Step ${step.stepNumber}: "${step.title}"\n`;
    });
    summary += `  Final URL: ${result.finalUrl}\n`;
    summary += '\n';
  });

  fs.writeFileSync('audit-onboarding-summary.txt', summary);
  fs.writeFileSync('audit-onboarding-report.json', JSON.stringify(results, null, 2));
}

main().catch(err => {
  fs.writeFileSync('audit-error.txt', err.toString());
});
