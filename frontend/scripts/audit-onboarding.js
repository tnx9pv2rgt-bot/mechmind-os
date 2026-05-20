const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SECTORS = ['Meccanica generale', 'Carrozzeria', 'Gommista'];
const BASE_URL = 'http://localhost:3000';

async function auditSector(sector) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const steps = [];
  let currentStep = 1;

  try {
    // Step 1: Navigate to onboarding
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Shop Name
    const step1Title = await page.locator('h1, h2, h3').first().textContent();

    const inputs = await page.locator('input, textarea').all();
    const inputLabels = [];
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      const label =
        placeholder ||
        ariaLabel ||
        (id ? await page.locator(`label[for="${id}"]`).textContent() : null);
      inputLabels.push(label?.trim() || 'unlabeled input');
    }

    steps.push({
      stepNumber: currentStep,
      title: step1Title?.trim() || 'Unknown Step 1',
      options: inputLabels,
    });

    // Fill shop name (using actual ID from HTML)
    const shopNameInput = page.locator('#shop-name');
    await shopNameInput.fill('Test');
    await page.waitForTimeout(500);

    // Click Continue
    const continueBtn = page
      .locator('button:has-text("Continua"), button:has-text("Continue")')
      .first();
    await continueBtn.click();
    await page.waitForLoadState('domcontentloaded');
    currentStep++;

    // Step 2: Sector Selection
    const step2Title = await page.locator('h1, h2, h3').first().textContent();

    const sectorOptions = await page.locator('button, [role="radio"], [role="option"]').all();
    const sectorTexts = [];
    for (const option of sectorOptions) {
      const text = await option.textContent();
      if (text && text.trim()) {
        sectorTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: currentStep,
      title: step2Title?.trim() || 'Unknown Step 2',
      options: sectorTexts,
    });

    // Click the sector
    const sectorButton = page.locator(`text="${sector}"`).first();
    await sectorButton.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const continueBtn2 = page
      .locator('button:has-text("Continua"), button:has-text("Continue")')
      .first();
    await continueBtn2.click();
    await page.waitForLoadState('domcontentloaded');
    currentStep++;

    // Step 3: Team Size
    const step3Title = await page.locator('h1, h2, h3').first().textContent();

    const teamOptions = await page.locator('button, [role="radio"], [role="option"], label').all();
    const teamTexts = [];
    for (const option of teamOptions) {
      const text = await option.textContent();
      if (text && text.trim()) {
        teamTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: currentStep,
      title: step3Title?.trim() || 'Unknown Step 3',
      options: teamTexts.slice(0, 5),
    });

    const firstTeamOption = page.locator('button, [role="radio"], label').first();
    await firstTeamOption.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const continueBtn3 = page
      .locator('button:has-text("Continua"), button:has-text("Continue")')
      .first();
    await continueBtn3.click();
    await page.waitForLoadState('domcontentloaded');
    currentStep++;

    // Step 4: Priority
    const step4Title = await page.locator('h1, h2, h3').first().textContent();

    const priorityOptions = await page
      .locator('button, [role="radio"], [role="option"], label')
      .all();
    const priorityTexts = [];
    for (const option of priorityOptions) {
      const text = await option.textContent();
      if (text && text.trim()) {
        priorityTexts.push(text.trim());
      }
    }

    steps.push({
      stepNumber: currentStep,
      title: step4Title?.trim() || 'Unknown Step 4',
      options: priorityTexts.slice(0, 5),
    });

    const firstPriorityOption = page.locator('button, [role="radio"], label').first();
    await firstPriorityOption.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Click "Vai al pannello"
    const goDashboardBtn = page
      .locator('button:has-text("Vai al pannello"), button:has-text("Go to Dashboard")')
      .first();
    await goDashboardBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture final state
    const finalUrl = page.url();
    const welcomeTitle = await page.locator('h1, h2, h3').first().textContent();
    const welcomeContent = await page.locator('body').textContent();

    await context.close();
    await browser.close();

    return {
      sector,
      steps,
      finalUrl,
      welcomePageText: welcomeTitle?.trim() || welcomeContent?.substring(0, 200) || 'No content',
      totalSteps: currentStep,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    await context.close();
    await browser.close();
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
        welcomePageText: '',
        totalSteps: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Build analysis
  const analysis = {
    step1TitleVariation: new Set(
      results.filter(r => r.steps.length > 0).map(r => r.steps[0]?.title)
    ).size,
    step2TitleVariation: new Set(
      results.filter(r => r.steps.length > 1).map(r => r.steps[1]?.title)
    ).size,
    step3TitleVariation: new Set(
      results.filter(r => r.steps.length > 2).map(r => r.steps[2]?.title)
    ).size,
    step4TitleVariation: new Set(
      results.filter(r => r.steps.length > 3).map(r => r.steps[3]?.title)
    ).size,
    finalUrlVariation: new Set(results.map(r => r.finalUrl)).size,
    welcomeTextVariation: new Set(results.map(r => r.welcomePageText)).size,
  };

  const report = {
    summary: {
      totalSectors: SECTORS.length,
      sectors: SECTORS,
      timestamp: new Date().toISOString(),
    },
    sectors: results,
    analysis,
  };

  // Write JSON report
  fs.writeFileSync('audit-onboarding-report.json', JSON.stringify(report, null, 2));

  // Write human-readable summary
  let summary = 'ONBOARDING SECTOR AUDIT REPORT\n';
  summary += '==============================\n\n';

  results.forEach((result, idx) => {
    if (result.error) {
      summary += `SECTOR ${idx + 1}: ${result.sector.toUpperCase()}\n`;
      summary += `─────────────────────────────────\n`;
      summary += `ERROR: ${result.error}\n\n`;
      return;
    }

    summary += `SECTOR ${idx + 1}: ${result.sector.toUpperCase()}\n`;
    summary += `─────────────────────────────────\n`;
    summary += `Total steps: ${result.totalSteps}\n`;
    summary += `Final URL: ${result.finalUrl}\n`;
    summary += `Welcome text: ${result.welcomePageText}\n\n`;

    result.steps.forEach(step => {
      summary += `  Step ${step.stepNumber}: "${step.title}"\n`;
      if (step.options.length > 0) {
        summary += `    Options: ${step.options.slice(0, 3).join(' | ')}\n`;
      }
    });
    summary += '\n';
  });

  summary += '\nCOMPARATIVE ANALYSIS\n';
  summary += '===================\n';
  summary += `Step 1 title variation: ${analysis.step1TitleVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.step1TitleVariation} variants)`}\n`;
  summary += `Step 2 title variation: ${analysis.step2TitleVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.step2TitleVariation} variants)`}\n`;
  summary += `Step 3 title variation: ${analysis.step3TitleVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.step3TitleVariation} variants)`}\n`;
  summary += `Step 4 title variation: ${analysis.step4TitleVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.step4TitleVariation} variants)`}\n`;
  summary += `Final URL variation: ${analysis.finalUrlVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.finalUrlVariation} variants)`}\n`;
  summary += `Welcome text variation: ${analysis.welcomeTextVariation === 1 ? 'SAME' : `DIFFERENT (${analysis.welcomeTextVariation} variants)`}\n`;

  fs.writeFileSync('audit-onboarding-summary.txt', summary);
}

main().catch(console.error);
