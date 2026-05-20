/**
 * QA E2E Test: Onboarding Personas
 * Tests 3 different shop types with Playwright
 * Usage: node test-personas.js
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
  log.info('Logging in...');
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);

  const loginBtn = await page.$('button:has-text("Accedi")') || await page.$('button[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForNavigation({ timeout: 5000 });
  }

  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
  log.ok('Logged in');
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
    shopType,
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
    await login(page);

    log.info('Going to /onboarding...');
    await resetOnboardingState(page);
    await page.goto(`${BASE_URL}/onboarding`);
    await page.waitForSelector('h1:has-text("Raccontaci della tua officina")', { timeout: 5000 });

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
    const continueBtn1 = await page.$('button:has-text("Continua")');
    if (continueBtn1) await continueBtn1.click();
    await page.waitForSelector(`button:has-text("${shopTypeLabel}")`, { timeout: 5000 });

    const shopTypeBtn = await page.$(`button:has-text("${shopTypeLabel}")`);
    if (shopTypeBtn) {
      await shopTypeBtn.click();
      log.ok(`Selected: ${shopTypeLabel}`);
    } else {
      personaReport.errors.push(`Could not find shop type button: "${shopTypeLabel}"`);
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
    log.info(`Step 3: Sector-specific questions for "${shopTypeLabel}"...`);
    const continueBtn2 = await page.$('button:has-text("Continua")');
    if (continueBtn2) await continueBtn2.click();

    await page.waitForSelector('button:has-text("Sì"), button:has-text("No")', {
      timeout: 5000
    }).catch(() => log.warn('No yes/no buttons found'));

    if (sectorAnswers && Object.keys(sectorAnswers).length > 0) {
      for (const [key, value] of Object.entries(sectorAnswers)) {
        const btnSelector = `button:has-text("${value}")`;
        const btn = await page.$(btnSelector).catch(() => null);
        if (btn) {
          await btn.click();
          log.info(`  Answered: ${value}`);
        }
      }
    }

    const step3Screen = await captureAndLog(page, 'step3-sector-questions', name);
    const step3Text = await getPageText(page);
    personaReport.steps.push({
      step: 3,
      title: `Sector Questions (${shopTypeLabel})`,
      screenshot: step3Screen,
      textContent: step3Text.filter(t => t.length > 10 && t.length < 300).slice(0, 10),
      sectorAnswers,
    });
    log.ok('Step 3: Sector questions screen captured');

    // Step 4: Team size
    log.info(`Step 4: Selecting team size "${teamSize}"...`);
    const continueBtn3 = await page.$('button:has-text("Continua")');
    if (continueBtn3) await continueBtn3.click();
    await page.waitForSelector(`button:has-text("${teamSize}")`, { timeout: 5000 });

    const teamSizeBtn = await page.$(`button:has-text("${teamSize}")`);
    if (teamSizeBtn) {
      await teamSizeBtn.click();
      log.ok(`Selected team size: ${teamSize}`);
    }

    const step4Screen = await captureAndLog(page, 'step4-teamsize', name);
    const step4Text = await getPageText(page);
    personaReport.steps.push({
      step: 4,
      title: `Team Size: ${teamSize}`,
      screenshot: step4Screen,
      textContent: step4Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 4: Team size screen captured');

    // Step 5: Priorities
    log.info(`Step 5: Selecting priority "${priority}"...`);
    const continueBtn4 = await page.$('button:has-text("Continua")');
    if (continueBtn4) await continueBtn4.click();
    await page.waitForSelector(`button:has-text("${priority}")`, { timeout: 5000 });

    const priorityBtn = await page.$(`button:has-text("${priority}")`);
    if (priorityBtn) {
      await priorityBtn.click();
      log.ok(`Selected priority: ${priority}`);
    }

    const step5Screen = await captureAndLog(page, 'step5-priorities', name);
    const step5Text = await getPageText(page);
    personaReport.steps.push({
      step: 5,
      title: `Priorities: ${priority}`,
      screenshot: step5Screen,
      textContent: step5Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 5: Priorities screen captured');

    // Step 6: Complete
    log.info('Step 6: Completing onboarding...');
    const finalBtn = await page.$('button:has-text("Vai al pannello")');
    if (finalBtn) {
      await finalBtn.click();

      try {
        await page.waitForURL(/\/(onboarding\/welcome|dashboard)/, { timeout: 10000 });
        const finalURL = page.url();
        log.ok(`Final URL: ${finalURL}`);
        personaReport.finalURL = finalURL;

        await page.waitForTimeout(500);
        const welcomeScreen = await captureAndLog(page, 'step6-welcome', name);
        const welcomeText = await getPageText(page);

        personaReport.steps.push({
          step: 6,
          title: 'Welcome Screen',
          screenshot: welcomeScreen,
          textContent: welcomeText.filter(t => t.length > 10 && t.length < 300).slice(0, 10),
        });

        if (page.url().includes('onboarding/welcome')) {
          const nextStepsText = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.space-y-2 > div').forEach(el => {
              const text = el.textContent?.trim();
              if (text) items.push(text);
            });
            return items;
          }).catch(() => null);

          if (nextStepsText) {
            personaReport.observations.push({
              field: 'nextSteps',
              value: nextStepsText,
            });
          }
        }
      } catch (e) {
        personaReport.errors.push(`Navigation failed: ${e.message}`);
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
      shopType: 'meccanica',
      shopTypeLabel: 'Meccanica generale',
      teamSize: 'Solo io',
      priority: 'appuntamenti',
      sectorAnswers: {
        'hasWarranty': 'Sì',
        'hasOBD': 'Sì',
      },
    },
    {
      name: 'Giulia (Carrozzeria)',
      shopType: 'carrozzeria',
      shopTypeLabel: 'Carrozzeria',
      teamSize: '2-5 persone',
      priority: 'fatturare',
      sectorAnswers: {
        'hasInsurance': 'Sì',
        'hasEstimator': 'No',
      },
    },
    {
      name: 'Salvatore (Gommista)',
      shopType: 'gommista',
      shopTypeLabel: 'Gommista',
      teamSize: '6+ persone',
      priority: 'lavorazioni',
      sectorAnswers: {
        'hasDeposit': 'Sì',
        'hasAlignment': 'Sì',
      },
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

  const bugs = identifyBugs(report);
  report.bugs = bugs;

  log.info(`\nFound ${bugs.length} issue(s):\n`);

  if (bugs.length === 0) {
    log.ok('No issues found!');
  } else {
    bugs.forEach((bug, i) => {
      log.info(`${i + 1}. [${bug.severity}] ${bug.title}`);
      log.info(`   Personas: ${bug.affectedPersonas.join(', ')}`);
      log.info(`   Details: ${bug.description}`);
      log.info('');
    });
  }

  const reportFile = '/tmp/persona-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log.ok(`Full report saved to: ${reportFile}`);

  return bugs.length === 0;
}

function identifyBugs(report) {
  const bugs = [];

  const nextStepsByPersona = {};
  report.personas.forEach(p => {
    const obs = p.observations.find(o => o.field === 'nextSteps');
    if (obs) {
      nextStepsByPersona[p.name] = JSON.stringify(obs.value);
    }
  });

  const uniqueNextSteps = new Set(Object.values(nextStepsByPersona));
  if (uniqueNextSteps.size === 1) {
    bugs.push({
      severity: 'MEDIUM',
      title: 'All personas see identical next steps',
      description: 'Expected sector-specific next steps, but all personas see the same generic list',
      affectedPersonas: report.personas.map(p => p.name),
    });
  }

  const allErrors = report.personas.flatMap(p =>
    p.errors.filter(e => !e.includes('401') && !e.includes('favicon'))
  );
  if (allErrors.length > 0) {
    bugs.push({
      severity: 'HIGH',
      title: 'Console errors detected',
      description: allErrors.join('; '),
      affectedPersonas: report.personas.filter(p => p.errors.length > 0).map(p => p.name),
    });
  }

  return bugs;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(e => {
    log.error(`Fatal error: ${e.message}`);
    process.exit(1);
  });
