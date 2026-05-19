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
    const step1Desc = await page.locator('p').first().textContent();
    const inputs1 = await page.locator('input').all();
    const inputLabels = [];
    for (const inp of inputs1) {
      const label = await page
        .locator(`label[for="${await inp.getAttribute('id')}"]`)
        .textContent();
      inputLabels.push(label?.trim() || 'input field');
    }

    steps.push({
      stepNumber: 1,
      title: step1Title?.trim() || 'Step 1',
      description: step1Desc?.trim() || '',
      elements: inputLabels,
    });

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
    const step2Desc = await page.locator('p').first().textContent();
    const sectorOptions = await page.locator('button').all();
    const sectorTexts = [];
    for (const opt of sectorOptions) {
      const text = await opt.textContent();
      if (text && text.trim().length > 0 && !text.includes('×')) {
        sectorTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: 2,
      title: step2Title?.trim() || 'Step 2',
      description: step2Desc?.trim() || '',
      elements: sectorTexts.slice(0, 8),
    });

    const sectorBtn = page
      .locator(`button:has(text="${sector}"), div:has(text="${sector}")`)
      .first();
    if (await sectorBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sectorBtn.click();
    } else {
      for (const btn of sectorOptions) {
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
    const step3Desc = await page.locator('p').first().textContent();
    const teamOptions = await page.locator('button').all();
    const teamTexts = [];
    for (const opt of teamOptions) {
      const text = await opt.textContent();
      if (text && text.trim().length > 0 && !text.includes('×')) {
        teamTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: 3,
      title: step3Title?.trim() || 'Step 3',
      description: step3Desc?.trim() || '',
      elements: teamTexts.slice(0, 8),
    });

    for (const opt of teamOptions) {
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
    const step4Desc = await page.locator('p').first().textContent();
    const priorityOptions = await page.locator('button').all();
    const priorityTexts = [];
    for (const opt of priorityOptions) {
      const text = await opt.textContent();
      if (text && text.trim().length > 0 && !text.includes('×')) {
        priorityTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: 4,
      title: step4Title?.trim() || 'Step 4',
      description: step4Desc?.trim() || '',
      elements: priorityTexts.slice(0, 8),
    });

    for (const opt of priorityOptions) {
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
      });
    }
  }

  fs.writeFileSync('audit-onboarding-report.json', JSON.stringify(results, null, 2));

  let summary = 'ONBOARDING SECTOR AUDIT REPORT (DETAILED)\n';
  summary += '======================================\n\n';

  results.forEach((result, idx) => {
    summary += `${idx + 1}. ${result.sector.toUpperCase()}\n`;
    summary += '─'.repeat(50) + '\n';

    if (result.error) {
      summary += `ERROR: ${result.error}\n\n`;
      return;
    }

    result.steps.forEach(step => {
      summary += `\n  STEP ${step.stepNumber}\n`;
      summary += `  Title: "${step.title}"\n`;
      if (step.description) {
        summary += `  Description: "${step.description}"\n`;
      }
      if (step.elements && step.elements.length > 0) {
        summary += `  Options: ${step.elements.join(' | ')}\n`;
      }
    });

    summary += `\n  FINAL URL: ${result.finalUrl}\n`;
    summary += '\n';
  });

  summary += '\nCOMPARATIVE FINDINGS\n';
  summary += '====================\n\n';

  const titles1 = new Set(results.filter(r => !r.error).map(r => r.steps[0]?.title));
  const titles2 = new Set(results.filter(r => !r.error).map(r => r.steps[1]?.title));
  const titles3 = new Set(results.filter(r => !r.error).map(r => r.steps[2]?.title));
  const titles4 = new Set(results.filter(r => !r.error).map(r => r.steps[3]?.title));
  const finalUrls = new Set(results.filter(r => !r.error).map(r => r.finalUrl));

  summary += `Step 1 titles: ${titles1.size === 1 ? 'IDENTICAL across all sectors' : 'DIFFERENT'}\n`;
  summary += `Step 2 titles: ${titles2.size === 1 ? 'IDENTICAL across all sectors' : 'DIFFERENT'}\n`;
  summary += `Step 3 titles: ${titles3.size === 1 ? 'IDENTICAL across all sectors' : 'DIFFERENT'}\n`;
  summary += `Step 4 titles: ${titles4.size === 1 ? 'IDENTICAL across all sectors' : 'DIFFERENT'}\n`;
  summary += `Final URLs: ${finalUrls.size === 1 ? 'IDENTICAL across all sectors' : 'DIFFERENT'}\n`;

  fs.writeFileSync('audit-onboarding-summary.txt', summary);
}

main().catch(err => {
  fs.writeFileSync('audit-error.txt', err.toString());
});
