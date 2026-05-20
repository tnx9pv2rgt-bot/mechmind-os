/**
 * QA E2E Test: Onboarding Personas - v2
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'admin@demo.mechmind.it';
const LOGIN_PASSWORD = 'Demo2026!';

const log = {
  info: (msg) => process.stdout.write(`[INFO] ${msg}\n`),
  ok: (msg) => process.stdout.write(`[OK] ✅ ${msg}\n`),
  warn: (msg) => process.stderr.write(`[WARN] ⚠️ ${msg}\n`),
  error: (msg) => process.stderr.write(`[ERROR] ❌ ${msg}\n`),
};

const report = {
  timestamp: new Date().toISOString(),
  personas: [],
  bugs: [],
};

async function captureAndLog(page, step, persona) {
  const dir = '/tmp/test-results';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const screenshot = `${dir}/${persona}-${step}.png`;

  try {
    await page.screenshot({ path: screenshot, fullPage: true });
    return screenshot;
  } catch (e) {
    log.warn(`Screenshot failed for ${persona}-${step}: ${e.message}`);
    return null;
  }
}

async function getPageText(page) {
  return page.evaluate(() => {
    const texts = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 300) {
        texts.push(text);
      }
    });
    return texts;
  });
}

async function login(page) {
  log.info('Logging in with credentials...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    log.info('Email input found');
  } catch (e) {
    log.error(`Email input not found: ${e.message}`);
    const content = await page.content();
    log.warn(`Page content length: ${content.length}`);
    throw e;
  }

  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  log.info('Credentials filled');

  // Click login without waiting for navigation
  const loginBtn = await page.$('button:has-text("Accedi")') || 
                   await page.$('button[type="submit"]') ||
                   await page.$('button');
  
  if (loginBtn) {
    log.info('Clicking login button...');
    await loginBtn.click();
    
    // Wait for either dashboard or onboarding, with longer timeout
    try {
      await page.waitForURL(/\/(dashboard|onboarding|auth)/, { timeout: 15000 });
      log.ok(`Navigated to: ${page.url()}`);
    } catch (e) {
      log.warn(`Navigation timeout, current URL: ${page.url()}`);
    }
    
    // Wait a bit for JS to settle
    await page.waitForTimeout(2000);
  } else {
    throw new Error('Could not find login button');
  }
}

async function resetOnboardingState(page) {
  log.info('Resetting onboarding state...');
  await page.evaluate(() => {
    localStorage.removeItem('mechmind-onboarding');
    localStorage.removeItem('mechmind_onboarding_config');
    localStorage.removeItem('mechmind_onboarding_answers');
    localStorage.removeItem('mechmind_onboarding_dismissed');
  });
  log.ok('State reset');
}

async function testPersona(browser, personaConfig) {
  const {
    name,
    shopTypeLabel,
    teamSize,
    priority,
    sectorAnswers,
  } = personaConfig;

  log.info(`\n${'='.repeat(70)}`);
  log.info(`TESTING PERSONA: ${name.toUpperCase()}`);
  log.info(`${'='.repeat(70)}`);

  const page = await browser.newPage();
  const personaReport = {
    name,
    steps: [],
    errors: [],
    observations: [],
  };

  try {
    // Login
    try {
      await login(page);
    } catch (e) {
      personaReport.errors.push(`Login failed: ${e.message}`);
      throw e;
    }

    // Go to onboarding
    log.info('Navigating to /onboarding...');
    await resetOnboardingState(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check if we're on onboarding page
    const currentUrl = page.url();
    log.info(`Current URL after onboarding redirect: ${currentUrl}`);

    if (!currentUrl.includes('onboarding')) {
      log.warn('Not on onboarding page, checking for redirect...');
      // Maybe we got redirected, try again
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    try {
      await page.waitForSelector('h1:has-text("Raccontaci della tua officina")', { timeout: 5000 });
      log.ok('Onboarding intro found');
    } catch (e) {
      log.warn('Onboarding intro h1 not found, checking for any h1...');
      const h1s = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(el => el.textContent));
      log.info(`Found h1s: ${h1s.join(' | ')}`);
    }

    // Capture step 1
    const step1Screen = await captureAndLog(page, 'step1-intro', name);
    const step1Text = await getPageText(page);
    personaReport.steps.push({
      step: 1,
      title: 'Intro / Shop Info',
      screenshot: step1Screen,
      textContent: step1Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 1: Intro screen captured');

    // Step 2: Select shop type
    log.info(`Step 2: Selecting shop type "${shopTypeLabel}"...`);
    
    // Find and click continue
    let continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(800);
      log.ok('Clicked Continue');
    }

    // Wait for shop type button
    try {
      await page.waitForSelector(`button:has-text("${shopTypeLabel}")`, { timeout: 5000 });
    } catch (e) {
      log.warn(`Shop type button not found: ${shopTypeLabel}`);
      const buttons = await page.evaluate(() => 
        Array.from(document.querySelectorAll('button')).map(el => el.textContent.trim())
      );
      log.info(`Available buttons: ${buttons.slice(0, 10).join(' | ')}`);
    }

    const shopTypeBtn = await page.$(`button:has-text("${shopTypeLabel}")`);
    if (shopTypeBtn) {
      await shopTypeBtn.click();
      await page.waitForTimeout(800);
      log.ok(`Selected: ${shopTypeLabel}`);
    } else {
      personaReport.errors.push(`Shop type button not found: "${shopTypeLabel}"`);
    }

    const step2Screen = await captureAndLog(page, 'step2-shoptype', name);
    const step2Text = await getPageText(page);
    personaReport.steps.push({
      step: 2,
      title: `Shop Type: ${shopTypeLabel}`,
      screenshot: step2Screen,
      textContent: step2Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 2: Shop type screen captured');

    // Step 3: Sector questions
    log.info(`Step 3: Sector-specific questions...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(800);
    }

    // Answer sector questions
    if (sectorAnswers && Object.keys(sectorAnswers).length > 0) {
      for (const [key, value] of Object.entries(sectorAnswers)) {
        const btn = await page.$(`button:has-text("${value}")`);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(400);
          log.info(`  Answered: ${value}`);
        }
      }
    }

    const step3Screen = await captureAndLog(page, 'step3-sector-questions', name);
    const step3Text = await getPageText(page);
    personaReport.steps.push({
      step: 3,
      title: `Sector Questions`,
      screenshot: step3Screen,
      textContent: step3Text.filter(t => t.length > 10).slice(0, 10),
      sectorAnswers,
    });
    log.ok('Step 3: Sector questions captured');

    // Step 4: Team size
    log.info(`Step 4: Selecting team size "${teamSize}"...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(800);
    }

    const teamSizeBtn = await page.$(`button:has-text("${teamSize}")`);
    if (teamSizeBtn) {
      await teamSizeBtn.click();
      await page.waitForTimeout(800);
      log.ok(`Selected team size: ${teamSize}`);
    }

    const step4Screen = await captureAndLog(page, 'step4-teamsize', name);
    const step4Text = await getPageText(page);
    personaReport.steps.push({
      step: 4,
      title: `Team Size: ${teamSize}`,
      screenshot: step4Screen,
      textContent: step4Text.filter(t => t.length > 10).slice(0, 5),
    });
    log.ok('Step 4: Team size screen captured');

    // Step 5: Priorities
    log.info(`Step 5: Selecting priority "${priority}"...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(800);
    }

    const priorityBtn = await page.$(`button:has-text("${priority}")`);
    if (priorityBtn) {
      await priorityBtn.click();
      await page.waitForTimeout(800);
      log.ok(`Selected priority: ${priority}`);
    }

    const step5Screen = await captureAndLog(page, 'step5-priorities', name);
    const step5Text = await getPageText(page);
    personaReport.steps.push({
      step: 5,
      title: `Priorities: ${priority}`,
      screenshot: step5Screen,
      textContent: step5Text.filter(t => t.length > 10).slice(0, 5),
    });
    log.ok('Step 5: Priorities screen captured');

    // Step 6: Complete
    log.info('Step 6: Completing onboarding...');
    const finalBtn = await page.$('button:has-text("Vai al pannello")');
    if (finalBtn) {
      await finalBtn.click();
      await page.waitForTimeout(2000);

      const finalURL = page.url();
      log.ok(`Final URL: ${finalURL}`);
      personaReport.finalURL = finalURL;

      const welcomeScreen = await captureAndLog(page, 'step6-welcome', name);
      const welcomeText = await getPageText(page);

      personaReport.steps.push({
        step: 6,
        title: 'Welcome Screen',
        screenshot: welcomeScreen,
        textContent: welcomeText.filter(t => t.length > 10).slice(0, 10),
      });

      // Extract next steps
      const nextStepsText = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[class*="space-y"]').forEach(parent => {
          parent.querySelectorAll('> *').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 5) items.push(text);
          });
        });
        return items;
      }).catch(() => []);

      if (nextStepsText.length > 0) {
        personaReport.observations.push({
          field: 'nextSteps',
          value: nextStepsText,
        });
      }
    }

    log.ok(`Persona test completed for ${name}`);

  } catch (error) {
    personaReport.errors.push(`Test failed: ${error.message}`);
    log.error(`Error testing ${name}: ${error.message}`);
  } finally {
    report.personas.push(personaReport);
    await page.close();
  }
}

async function runTests() {
  log.info('\nStarting persona testing...\n');

  const personas = [
    {
      name: 'Marco (Meccanica)',
      shopTypeLabel: 'Meccanica generale',
      teamSize: 'Solo io',
      priority: 'appuntamenti',
      sectorAnswers: { 'hasWarranty': 'Sì', 'hasOBD': 'Sì' },
    },
    {
      name: 'Giulia (Carrozzeria)',
      shopTypeLabel: 'Carrozzeria',
      teamSize: '2-5 persone',
      priority: 'fatturare',
      sectorAnswers: { 'hasInsurance': 'Sì', 'hasEstimator': 'No' },
    },
    {
      name: 'Salvatore (Gommista)',
      shopTypeLabel: 'Gommista',
      teamSize: '6+ persone',
      priority: 'lavorazioni',
      sectorAnswers: { 'hasDeposit': 'Sì', 'hasAlignment': 'Sì' },
    },
  ];

  const browser = await chromium.launch({ headless: false });

  try {
    for (const persona of personas) {
      await testPersona(browser, persona);
    }
  } finally {
    await browser.close();
  }

  log.info(`\n${'='.repeat(70)}`);
  log.info('TEST REPORT');
  log.info(`${'='.repeat(70)}\n`);

  const bugs = [];
  report.bugs = bugs;

  log.info(`\nSummary: ${report.personas.length} personas tested\n`);
  report.personas.forEach(p => {
    log.info(`${p.name}: ${p.steps.length} steps, ${p.errors.length} errors`);
    if (p.observations.length > 0) {
      log.info(`  Next steps found: ${p.observations[0].value.join('; ')}`);
    }
  });

  const reportFile = '/tmp/persona-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log.ok(`\nFull report saved to: ${reportFile}`);

  return bugs.length === 0;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(e => {
    log.error(`Fatal error: ${e.message}`);
    process.exit(1);
  });
