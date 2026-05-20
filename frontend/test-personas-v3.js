/**
 * QA E2E Test: Onboarding Personas - v3
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
  
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);

  const loginBtn = await page.$('button:has-text("Accedi")') || 
                   await page.$('button[type="submit"]') ||
                   await page.$('button');
  
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(3000);
  }
}

async function resetOnboardingState(page) {
  await page.evaluate(() => {
    localStorage.removeItem('mechmind-onboarding');
    localStorage.removeItem('mechmind_onboarding_config');
    localStorage.removeItem('mechmind_onboarding_answers');
    localStorage.removeItem('mechmind_onboarding_dismissed');
  });
}

async function testPersona(browser, personaConfig) {
  const {
    name,
    shopName,
    shopCity,
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

    // Step 1: Fill shop info
    log.info('Step 1: Filling shop info...');
    const nameInput = await page.$('input#shop-name');
    if (nameInput) {
      await nameInput.fill(shopName);
      log.ok(`Shop name: ${shopName}`);
    }

    const cityInput = await page.$('input#shop-city');
    if (cityInput) {
      await cityInput.fill(shopCity);
      log.ok(`Shop city: ${shopCity}`);
    }

    const step1Screen = await captureAndLog(page, 'step1-shopinfo', name);
    const step1Text = await getPageText(page);
    personaReport.steps.push({
      step: 1,
      title: 'Shop Info',
      screenshot: step1Screen,
      shopName,
      shopCity,
      textContent: step1Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 1: Shop info captured');

    // Step 2: Select shop type
    log.info(`Step 2: Selecting shop type "${shopTypeLabel}"...`);
    let continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    const shopTypeBtn = await page.$(`button:has-text("${shopTypeLabel}")`);
    if (shopTypeBtn) {
      await shopTypeBtn.click();
      await page.waitForTimeout(1000);
      log.ok(`Selected: ${shopTypeLabel}`);
    }

    const step2Screen = await captureAndLog(page, 'step2-shoptype', name);
    const step2Text = await getPageText(page);
    personaReport.steps.push({
      step: 2,
      title: `Shop Type: ${shopTypeLabel}`,
      screenshot: step2Screen,
      textContent: step2Text.filter(t => t.length > 10 && t.length < 200).slice(0, 5),
    });
    log.ok('Step 2: Shop type captured');

    // Step 3: Sector questions
    log.info(`Step 3: Sector-specific questions...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Capture sector question text
    const sectorQuestionsText = await page.evaluate(() => {
      const questions = [];
      document.querySelectorAll('[class*="flex-col"][class*="gap"]').forEach(section => {
        const text = section.textContent?.trim();
        if (text && text.length > 20 && text.length < 500) {
          questions.push(text);
        }
      });
      return questions;
    });

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
      title: `Sector Questions (${shopTypeLabel})`,
      screenshot: step3Screen,
      questionsAsked: sectorQuestionsText,
      sectorAnswersGiven: sectorAnswers,
      textContent: step3Text.filter(t => t.length > 10).slice(0, 10),
    });
    log.ok('Step 3: Sector questions captured');

    // Step 4: Team size
    log.info(`Step 4: Selecting team size "${teamSize}"...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    const teamSizeBtn = await page.$(`button:has-text("${teamSize}")`);
    if (teamSizeBtn) {
      await teamSizeBtn.click();
      await page.waitForTimeout(1000);
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
    log.ok('Step 4: Team size captured');

    // Step 5: Priorities
    log.info(`Step 5: Selecting priority "${priority}"...`);
    continueBtn = await page.$('button:has-text("Continua")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    const priorityBtn = await page.$(`button:has-text("${priority}")`);
    if (priorityBtn) {
      await priorityBtn.click();
      await page.waitForTimeout(1000);
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
    log.ok('Step 5: Priorities captured');

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

      // Extract next steps - look for numbered items
      const nextStepsData = await page.evaluate(() => {
        const steps = [];
        // Look for elements with numbers
        document.querySelectorAll('[class*="rounded-full"]').forEach(el => {
          const number = el.textContent?.trim();
          const sibling = el.parentElement?.nextElementSibling;
          const stepText = sibling?.textContent?.trim();
          if (number && stepText && /^\d+$/.test(number)) {
            steps.push(stepText);
          }
        });
        return steps;
      }).catch(() => []);

      if (nextStepsData.length > 0) {
        personaReport.observations.push({
          field: 'nextSteps',
          value: nextStepsData,
          count: nextStepsData.length,
        });
        log.ok(`Next steps found: ${nextStepsData.join(' | ')}`);
      } else {
        log.warn('No next steps found in welcome screen');
      }

      // Also check welcome message mentions sector
      const welcomeMsg = welcomeText.join(' ').toLowerCase();
      const shopTypeKeyword = shopTypeLabel.toLowerCase();
      if (welcomeMsg.includes(shopTypeKeyword)) {
        log.ok(`Welcome message mentions "${shopTypeLabel}"`);
        personaReport.observations.push({
          field: 'welcomePersonalization',
          value: `Mentions ${shopTypeLabel}`,
        });
      } else {
        log.warn(`Welcome message does NOT mention "${shopTypeLabel}"`);
        personaReport.observations.push({
          field: 'welcomePersonalization',
          value: `Does NOT mention ${shopTypeLabel}`,
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
      shopName: 'Autofficina Rossi',
      shopCity: 'Milano',
      shopTypeLabel: 'Meccanica generale',
      teamSize: 'Solo io',
      priority: 'appuntamenti',
      sectorAnswers: { 'hasWarranty': 'Sì', 'hasOBD': 'Sì' },
    },
    {
      name: 'Giulia (Carrozzeria)',
      shopName: 'Carrozzeria Bianchi',
      shopCity: 'Roma',
      shopTypeLabel: 'Carrozzeria',
      teamSize: '2-5 persone',
      priority: 'fatturare',
      sectorAnswers: { 'hasInsurance': 'Sì', 'hasEstimator': 'No' },
    },
    {
      name: 'Salvatore (Gommista)',
      shopName: 'Gomme Giuliano',
      shopCity: 'Napoli',
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
  log.info('TEST REPORT SUMMARY');
  log.info(`${'='.repeat(70)}\n`);

  report.personas.forEach(p => {
    const status = p.errors.length === 0 ? '✅' : '❌';
    log.info(`${status} ${p.name}: ${p.steps.length} steps completed`);
    
    if (p.finalURL) {
      log.info(`   Final URL: ${p.finalURL}`);
    }
    
    p.observations.forEach(obs => {
      log.info(`   ${obs.field}: ${obs.value}`);
    });
    
    if (p.errors.length > 0) {
      log.error(`   Errors: ${p.errors.join('; ')}`);
    }
  });

  // Analyze for bugs
  log.info(`\n${'='.repeat(70)}`);
  log.info('BUG ANALYSIS');
  log.info(`${'='.repeat(70)}\n`);

  const bugs = [];

  // Check if all personas got same next steps
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
      title: 'All personas see IDENTICAL next steps (not sector-specific)',
      personas: Object.keys(nextStepsByPersona),
    });
  }

  // Check welcome personalization
  const notPersonalized = report.personas
    .filter(p => p.observations.some(o => o.field === 'welcomePersonalization' && o.value.includes('NOT')))
    .map(p => p.name);

  if (notPersonalized.length > 0) {
    bugs.push({
      severity: 'MEDIUM',
      title: 'Welcome screen NOT personalized for sector',
      personas: notPersonalized,
    });
  }

  if (bugs.length === 0) {
    log.ok('No major issues found!');
  } else {
    bugs.forEach((bug, i) => {
      log.error(`${i + 1}. [${bug.severity}] ${bug.title}`);
      log.error(`   Affected: ${bug.personas.join(', ')}`);
    });
  }

  report.bugs = bugs;

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
