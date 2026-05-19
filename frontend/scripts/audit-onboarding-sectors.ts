import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SECTORS = ['Meccanica generale', 'Carrozzeria', 'Gommista'];
const BASE_URL = 'http://localhost:3000';

interface StepData {
  stepNumber: number;
  title: string;
  options: string[];
}

interface SectorAudit {
  sector: string;
  steps: StepData[];
  finalUrl: string;
  welcomePageText: string;
  totalSteps: number;
  timestamp: string;
}

interface ReportAnalysis {
  step1TitleVariation: number;
  step2TitleVariation: number;
  step3TitleVariation: number;
  step4TitleVariation: number;
  finalUrlVariation: number;
  welcomeTextVariation: number;
}

async function auditSector(sector: string): Promise<SectorAudit> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const steps: StepData[] = [];
  let currentStep: number = 1;

  try {
    // Step 1: Navigate to onboarding
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Shop Name
    const step1Title: string | null = await page.locator('h1, h2, h3').first().textContent();

    const inputs = await page.locator('input, textarea').all();
    const inputLabels: string[] = [];
    for (const input of inputs) {
      const label =
        (await input.getAttribute('placeholder')) ||
        (await input.getAttribute('aria-label')) ||
        (await page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent());
      inputLabels.push(label?.trim() || 'unlabeled input');
    }

    steps.push({
      stepNumber: currentStep,
      title: step1Title?.trim() || 'Unknown Step 1',
      options: inputLabels,
    });

    // Fill shop name (required)
    const shopNameInput = page
      .locator('input[placeholder*="nome"], input[placeholder*="Name"], input[placeholder*="shop"]')
      .first();
    await shopNameInput.fill('Test');

    // Don't fill city (leave empty as per instructions)
    await page.waitForTimeout(500);

    // Click Continue/Continua button
    const continueBtn = page
      .locator('button:has-text("Continua"), button:has-text("Continue")')
      .first();
    await continueBtn.click();
    await page.waitForLoadState('domcontentloaded');
    currentStep++;

    // Step 2: Sector Selection
    const step2Title: string | null = await page.locator('h1, h2, h3').first().textContent();

    const sectorOptions = await page.locator('button, [role="radio"], [role="option"]').all();
    const sectorTexts: string[] = [];
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

    // Click the sector square/button matching our sector
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
    const step3Title: string | null = await page.locator('h1, h2, h3').first().textContent();

    const teamOptions = await page.locator('button, [role="radio"], [role="option"], label').all();
    const teamTexts: string[] = [];
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

    // Click first team size option
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
    const step4Title: string | null = await page.locator('h1, h2, h3').first().textContent();

    const priorityOptions = await page
      .locator('button, [role="radio"], [role="option"], label')
      .all();
    const priorityTexts: string[] = [];
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

    // Click first priority option
    const firstPriorityOption = page.locator('button, [role="radio"], label').first();
    await firstPriorityOption.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Click "Vai al pannello" (Go to Dashboard) button
    const goDashboardBtn = page
      .locator('button:has-text("Vai al pannello"), button:has-text("Go to Dashboard")')
      .first();
    await goDashboardBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture final URL and page content
    const finalUrl: string = page.url();
    const welcomeTitle: string | null = await page.locator('h1, h2, h3').first().textContent();
    const welcomeContent: string | null = await page.locator('body').textContent();

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

async function main(): Promise<void> {
  const results: SectorAudit[] = [];

  for (const sector of SECTORS) {
    const result = await auditSector(sector);
    results.push(result);
  }

  // Build report
  const analysis: ReportAnalysis = {
    step1TitleVariation: new Set(results.map(r => r.steps[0]?.title)).size,
    step2TitleVariation: new Set(results.map(r => r.steps[1]?.title)).size,
    step3TitleVariation: new Set(results.map(r => r.steps[2]?.title)).size,
    step4TitleVariation: new Set(results.map(r => r.steps[3]?.title)).size,
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

  // Write to file
  const reportPath = path.join(process.cwd(), 'audit-onboarding-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Write human-readable summary
  let summary = '';
  summary += 'ONBOARDING SECTOR AUDIT REPORT\n';
  summary += '==============================\n\n';

  results.forEach((result, idx) => {
    summary += `SECTOR ${idx + 1}: ${result.sector.toUpperCase()}\n`;
    summary += `─────────────────────────────────\n`;
    summary += `Total steps: ${result.totalSteps}\n`;
    summary += `Final URL: ${result.finalUrl}\n`;
    summary += `Welcome text: ${result.welcomePageText}\n\n`;

    result.steps.forEach(step => {
      summary += `  Step ${step.stepNumber}: "${step.title}"\n`;
      summary += `    Options: ${step.options.slice(0, 3).join(' | ')}\n`;
    });
    summary += '\n';
  });

  summary += '\nCOMPARATIVE ANALYSIS\n';
  summary += '===================\n';
  summary += `Step 1 title variation: ${analysis.step1TitleVariation === 1 ? 'SAME' : 'DIFFERENT'}\n`;
  summary += `Step 2 title variation: ${analysis.step2TitleVariation === 1 ? 'SAME' : 'DIFFERENT'}\n`;
  summary += `Step 3 title variation: ${analysis.step3TitleVariation === 1 ? 'SAME' : 'DIFFERENT'}\n`;
  summary += `Step 4 title variation: ${analysis.step4TitleVariation === 1 ? 'SAME' : 'DIFFERENT'}\n`;
  summary += `Final URL variation: ${analysis.finalUrlVariation === 1 ? 'SAME' : 'DIFFERENT'}\n`;

  const summaryPath = path.join(process.cwd(), 'audit-onboarding-summary.txt');
  fs.writeFileSync(summaryPath, summary);
}

main();
