/**
 * AUDIT MECCANICO — Dashboard Nexo
 * Prospettiva: titolare di officina che apre la dashboard alle 8:00.
 */
import { test, devices, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../bug-reports/dashboard');
const BASE = 'http://localhost:3000';
const REPORT_PATH = path.join(SCREENSHOT_DIR, '_AUDIT-REPORT.json');

const findings: Record<string, unknown> = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE,
};

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.afterAll(async () => {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(findings, null, 2));
});

async function loginDemo(page: Page): Promise<boolean> {
  // Retry fino a 3 volte: backend dev può rispondere 502 sotto load
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await page.request.post(`${BASE}/api/auth/demo-session`);
      if (res.ok()) return true;
    } catch {
      // network error, retry
    }
    await new Promise(r => setTimeout(r, 800));
  }
  return false;
}

test.describe.configure({ mode: 'serial' });

test.use({
  baseURL: BASE,
  viewport: { width: 1024, height: 768 },
});

test('AUDIT 1 — Primo impatto su tablet 1024x768 alle 8:00', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('requestfailed', r =>
    failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText ?? 'failed'}`)
  );

  const loggedIn = await loginDemo(page);
  findings.demoLoginSuccess = loggedIn;

  const startNav = Date.now();
  await page.goto('/dashboard', { waitUntil: 'commit' });
  const ttfb = Date.now() - startNav;

  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01-first-impact-2s.png'),
    fullPage: false,
  });

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const fcpTime = Date.now() - startNav;
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const ttiApprox = Date.now() - startNav;

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-dashboard-loaded-fullpage.png'),
    fullPage: true,
  });

  const perfMetrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? null;
    const fp = paints.find(p => p.name === 'first-paint')?.startTime ?? null;
    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.fetchStart : null,
      loadComplete: nav ? nav.loadEventEnd - nav.fetchStart : null,
      domInteractive: nav ? nav.domInteractive - nav.fetchStart : null,
      firstPaint: fp,
      firstContentfulPaint: fcp,
      transferSize: nav ? nav.transferSize : null,
      encodedBodySize: nav ? nav.encodedBodySize : null,
    };
  });

  const lcp = await page
    .evaluate(
      () =>
        new Promise<number | null>(resolve => {
          let lcpVal: number | null = null;
          interface LCPEntry extends PerformanceEntry {
            renderTime?: number;
            loadTime?: number;
          }
          const obs = new PerformanceObserver(list => {
            const entries = list.getEntries() as LCPEntry[];
            const last = entries[entries.length - 1];
            lcpVal = last.renderTime || last.loadTime || last.startTime;
          });
          try {
            obs.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {
            resolve(null);
            return;
          }
          setTimeout(() => {
            obs.disconnect();
            resolve(lcpVal);
          }, 2000);
        })
    )
    .catch(() => null);

  const cls = await page
    .evaluate(
      () =>
        new Promise<number>(resolve => {
          let total = 0;
          interface LayoutShiftEntry extends PerformanceEntry {
            hadRecentInput?: boolean;
            value?: number;
          }
          try {
            const obs = new PerformanceObserver(list => {
              const entries = list.getEntries() as LayoutShiftEntry[];
              for (const entry of entries) {
                if (!entry.hadRecentInput && typeof entry.value === 'number') {
                  total += entry.value;
                }
              }
            });
            obs.observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => {
              obs.disconnect();
              resolve(total);
            }, 1500);
          } catch {
            resolve(0);
          }
        })
    )
    .catch(() => 0);

  findings.firstImpact = {
    ttfb,
    fcpApprox: fcpTime,
    ttiApprox,
    perfMetrics,
    lcp,
    cls,
    consoleErrors: consoleErrors.slice(0, 20),
    consoleWarnings: consoleWarnings.slice(0, 20),
    failedRequests: failedRequests.slice(0, 20),
    consoleErrorsTotal: consoleErrors.length,
    consoleWarningsTotal: consoleWarnings.length,
    failedRequestsTotal: failedRequests.length,
  };

  const titleVisible = await page
    .locator('h1, [role="heading"][aria-level="1"]')
    .first()
    .textContent({ timeout: 3000 })
    .catch(() => null);
  const dateText = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('body *')).map(el => el.textContent || '');
    const re =
      /(\b(?:luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b|\b\d{1,2}[/\s-]\d{1,2}[/\s-]\d{2,4}\b|\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b)/i;
    return all.find(t => re.test(t)) ?? null;
  });
  findings.heading = {
    h1: titleVisible,
    dateFound: dateText?.slice(0, 100) ?? null,
  };
});

test('AUDIT 2 — Inventario widget, dati e localizzazione (1024x768)', async ({ page }) => {
  test.setTimeout(60_000);
  await loginDemo(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);

  const widgets = await page.evaluate(() => {
    interface WidgetInfo {
      title: string;
      chars: number;
      hasEmpty: boolean;
    }
    const out: WidgetInfo[] = [];
    const candidates = Array.from(
      document.querySelectorAll(
        '[class*="card" i], [class*="Card" i], [data-testid*="card"], section, article'
      )
    );
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 80) continue;
      const titleEl =
        el.querySelector('h2, h3, h4, [class*="title" i]') || el.querySelector('header');
      const title = titleEl?.textContent?.trim().slice(0, 100) ?? '';
      if (!title) continue;
      const txt = (el.textContent ?? '').trim();
      const lower = txt.toLowerCase();
      const hasEmpty =
        /nessun|nessuna|non ci sono|empty|no data|nothing|crea il primo/.test(lower) ||
        txt.length < title.length + 5;
      out.push({ title, chars: txt.length, hasEmpty });
    }
    const seen = new Set<string>();
    return out.filter(w => {
      if (seen.has(w.title)) return false;
      seen.add(w.title);
      return true;
    });
  });
  findings.widgets = widgets;

  const englishStrings = await page.evaluate(() => {
    const BLACKLIST = [
      'loading',
      'error',
      'no data',
      'submit',
      'save',
      'cancel',
      'delete',
      'edit',
      'view',
      'search',
      'filter',
      'next',
      'previous',
      'back',
      'continue',
      'undefined',
      'fetching',
      '[object Object]',
      'TypeError',
      'today',
      'tomorrow',
      'yesterday',
    ];
    interface EnglishHit {
      word: string;
      context: string;
    }
    const out: EnglishHit[] = [];
    // Walk solo testo VISIBILE — escludo script/style/hidden
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node): number {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const txt = node.textContent ?? '';
      const lower = txt.toLowerCase();
      for (const w of BLACKLIST) {
        const re = new RegExp(`\\b${w.replace(/[[\]\.]/g, '\\$&')}\\b`, 'i');
        if (re.test(lower)) {
          out.push({ word: w, context: txt.trim().slice(0, 120) });
          break;
        }
      }
    }
    return out;
  });
  findings.englishStrings = englishStrings;

  const formatCheck = await page.evaluate(() => {
    const body = document.body.textContent ?? '';
    return {
      hasItalianCurrency: /\d{1,3}(?:\.\d{3})*,\d{2}\s*€|€\s*\d/.test(body),
      hasEnglishCurrency: /\$\s*\d|\d{1,3}(?:,\d{3})+\.\d{2}/.test(body),
      hasItalianDate: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(body),
      hasHHMM: /\b\d{1,2}:\d{2}\b/.test(body),
    };
  });
  findings.formats = formatCheck;

  // Verifica visibilità logout sia per testo che data-testid
  const logoutInfo = await page.evaluate(() => {
    const byTestId = document.querySelector('[data-testid="sidebar-logout-button"]');
    if (byTestId) {
      const r = byTestId.getBoundingClientRect();
      return { found: true, w: Math.round(r.width), h: Math.round(r.height), method: 'testid' };
    }
    const all = Array.from(document.querySelectorAll('a, button'));
    const found = all.find(el =>
      /\besci\b|\blogout\b|\bdisconnett/.test((el.textContent ?? '').toLowerCase())
    );
    if (!found) return { found: false };
    const r = found.getBoundingClientRect();
    return { found: true, w: Math.round(r.width), h: Math.round(r.height), method: 'text' };
  });
  findings.logoutVisible = logoutInfo;

  // Verifica widget Appuntamenti di oggi
  const appointmentsWidget = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="today-appointments-widget"]');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const title = el.querySelector('h2')?.textContent ?? '';
    return {
      found: true,
      y: Math.round(r.top),
      title,
      // y deve essere SOPRA le KPI cards (che iniziano ~y=200+ in 1024 viewport)
    };
  });
  findings.appointmentsWidget = appointmentsWidget;

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03-widget-inventory.png'),
    fullPage: true,
  });
});

test('AUDIT 3 — Touch target e usabilità tablet 1024x768', async ({ page }) => {
  test.setTimeout(60_000);
  await loginDemo(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const touchTargets = await page.evaluate(() => {
    const SELECTORS =
      'a, button, [role="button"], input[type="checkbox"], input[type="radio"], select, [tabindex]:not([tabindex="-1"])';
    const all = Array.from(document.querySelectorAll(SELECTORS)) as HTMLElement[];
    const visible = all.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    });
    interface SmallTarget {
      tag: string;
      w: number;
      h: number;
      text: string;
      aria: string | null;
      x: number;
      y: number;
    }
    const small: SmallTarget[] = visible
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          text: (el.textContent ?? '').trim().slice(0, 60),
          aria: el.getAttribute('aria-label'),
          x: Math.round(rect.left),
          y: Math.round(rect.top),
        };
      })
      .filter(t => t.w < 44 || t.h < 44);
    return {
      totalVisible: visible.length,
      undersized44: small.length,
      smallSamples: small.slice(0, 20),
    };
  });
  findings.touchTargets1024 = touchTargets;

  const primaryActions = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('a, button')) as HTMLElement[];
    return candidates
      .filter(el => {
        const txt = (el.textContent ?? '').toLowerCase();
        return /nuovo|nuova|crea|aggiungi|inserisci/.test(txt);
      })
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.textContent ?? '').trim().slice(0, 80),
          x: Math.round(r.x),
          y: Math.round(r.y),
          inThumbZone: r.y > window.innerHeight * 0.6,
        };
      })
      .slice(0, 10);
  });
  findings.primaryActions1024 = primaryActions;
});

test('AUDIT 4 — Mobile 375x812 (iPhone SE simulato)', async ({ browser }) => {
  test.setTimeout(60_000);
  // Esplicito viewport 375x812 (iPhone X/SE) — il preset di Playwright
  // a volte non applica le dimensioni quando il device key non esiste.
  void devices; // tenuto solo per evitare warning unused import
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await loginDemo(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '04-mobile-375.png'),
    fullPage: true,
  });
  const mobileTargets = await page.evaluate(() => {
    const all = Array.from(
      document.querySelectorAll(
        'a, button, [role="button"], input, select, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    const visible = all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
    });
    const small = visible.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width < 44 || r.height < 44;
    });
    const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
    return {
      visibleCount: visible.length,
      undersizedCount: small.length,
      horizontalOverflow,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  findings.mobile375 = mobileTargets;
  await ctx.close();
});

test('AUDIT 5 — Accessibilità (axe-core, WCAG 2.2 AA)', async ({ page }) => {
  test.setTimeout(60_000);
  await loginDemo(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  findings.axe = {
    totalViolations: axe.violations.length,
    critical: axe.violations.filter(v => v.impact === 'critical').length,
    serious: axe.violations.filter(v => v.impact === 'serious').length,
    moderate: axe.violations.filter(v => v.impact === 'moderate').length,
    minor: axe.violations.filter(v => v.impact === 'minor').length,
    violations: axe.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length,
      samples: v.nodes.slice(0, 3).map(n => ({
        html: n.html.slice(0, 200),
        target: n.target,
        failureSummary: n.failureSummary?.slice(0, 200) ?? '',
      })),
    })),
  };
});

test('AUDIT 6 — Stato BACKEND SPENTO (tutte API → fail)', async ({ page }) => {
  test.setTimeout(60_000);
  // Retry login fino a 3 volte (backend dev può essere lento)
  let loggedIn = false;
  for (let i = 0; i < 3 && !loggedIn; i++) {
    loggedIn = await loginDemo(page);
    if (!loggedIn) await page.waitForTimeout(1000);
  }
  findings.audit6LoginSuccess = loggedIn;
  // Verifica iniziale che /api/auth/me ritorni user prima di applicare il blocco
  const meCheck = await page.request.get(`${BASE}/api/auth/me`);
  const meBody = (await meCheck.json()) as { user: { name?: string } | null };
  findings.audit6MeBeforeBlock = { ok: meCheck.ok(), hasUser: !!meBody.user };

  // Simula backend down per i DATA endpoint, mantenendo /api/auth/* funzionante
  // così l'utente resta autenticato e la dashboard può mostrare l'error banner.
  // Questo scenario è realistico: backend ERP down ma session/edge layer ok.
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    // Mantieni viva l'autenticazione client-side: l'utente È loggato,
    // solo i dati business sono irraggiungibili
    if (url.includes('/api/auth/')) return route.continue();
    return route.abort('failed');
  });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '06-backend-down.png'),
    fullPage: true,
  });

  const errorMessages = await page.evaluate(() => {
    const alertBanner = document.querySelector('[data-testid="dashboard-error-banner"]');
    const retryButton = document.querySelector('[data-testid="dashboard-error-retry"]');
    // Solo testo VISIBILE
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n: Node): number {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
        const s = window.getComputedStyle(p);
        if (s.display === 'none' || s.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let visible = '';
    let n: Node | null;
    while ((n = walker.nextNode())) visible += ' ' + (n.textContent ?? '');
    const lower = visible.toLowerCase();
    return {
      hasItalianError:
        /errore|non disponibile|riprova|connessione|servizio temporaneamente|offline/.test(lower),
      hasEnglishError: /\bloading\.\.\.\b|\bfetch failed\b/.test(lower),
      hasAlertBanner: !!alertBanner,
      hasAlertRole: alertBanner?.getAttribute('role') === 'alert',
      hasRetryButton: !!retryButton,
      // NON deve aver reindirizzato al login
      isOnLoginPage: /\baccedi\b|continua con google|magic link|prova la demo/.test(lower),
      isBlank: visible.trim().length < 100,
      textLength: visible.length,
      sample: visible.trim().slice(0, 300),
    };
  });
  findings.stateBackendDown = {
    ...errorMessages,
    consoleErrorsCount: consoleErrors.length,
    consoleErrorsSample: consoleErrors.slice(0, 5),
  };
});

test('AUDIT 7 — Stato BACKEND LENTO (8 secondi delay)', async ({ page }) => {
  test.setTimeout(90_000);
  await loginDemo(page);

  await page.route('**/api/**', async route => {
    if (route.request().url().includes('/auth/demo-session')) return route.continue();
    await new Promise(r => setTimeout(r, 8000));
    return route.continue();
  });

  const start = Date.now();
  await page.goto('/dashboard', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);
  const tAt1500 = Date.now() - start;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '07-slow-backend-1.5s.png'),
    fullPage: false,
  });

  const skeletons = await page.evaluate(() => {
    const sels = [
      '[class*="skeleton" i]',
      '[aria-busy="true"]',
      '[data-loading="true"]',
      '[class*="shimmer" i]',
      '[class*="pulse" i]',
    ];
    const out: number[] = [];
    sels.forEach(s => out.push(document.querySelectorAll(s).length));
    return {
      total: out.reduce((a, b) => a + b, 0),
      breakdown: sels.map((s, i) => ({ selector: s, count: out[i] })),
      hasSpinnerOrLoader:
        document.querySelectorAll('[role="progressbar"], [class*="spinner" i], [class*="loader" i]')
          .length > 0,
    };
  });
  findings.stateBackendSlow = { tAt1500, skeletons };
});

test('AUDIT 8 — Stato DATI VUOTI (API → array vuoto)', async ({ page }) => {
  test.setTimeout(60_000);
  await loginDemo(page);

  // Mantieni vivi gli endpoint /api/auth/* per non forzare logout durante il test.
  // Ritorna array vuoti per tutti gli altri endpoint business (GET).
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    if (url.includes('/api/auth/')) return route.continue();
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
    });
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '08-empty-state.png'),
    fullPage: true,
  });

  const emptyMessages = await page.evaluate(() => {
    // Solo testo VISIBILE all'utente (non SSR payload, non script, non hidden)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node): number {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let visibleText = '';
    let node: Node | null;
    while ((node = walker.nextNode())) {
      visibleText += ' ' + (node.textContent ?? '');
    }
    const lower = visibleText.toLowerCase();
    return {
      hasHelpfulEmpty:
        /nessun appuntamento|nessun ordine|nessun cliente|crea il primo|crea ora|crea appuntamento|inizia/.test(
          lower
        ),
      hasNaNorUndefined: /\bnan\b|\bundefined\b|\bnull\b/.test(lower),
      visibleSample: visibleText.trim().slice(0, 500),
    };
  });
  findings.stateEmpty = emptyMessages;
});

test('AUDIT 9 — Keyboard navigation (Tab x 30)', async ({ page }) => {
  test.setTimeout(60_000);
  await loginDemo(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  interface FocusInfo {
    tag: string;
    text: string;
    hasVisibleFocus: boolean;
  }
  const focused: FocusInfo[] = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = window.getComputedStyle(el);
      const focusStyle =
        style.outlineStyle !== 'none' && style.outlineWidth !== '0px' && style.outlineWidth !== '';
      const shadow = style.boxShadow;
      const hasRingShadow = shadow !== 'none' && shadow !== '';
      return {
        tag: el.tagName,
        text: (el.textContent ?? '').trim().slice(0, 60),
        hasVisibleFocus: focusStyle || hasRingShadow,
      };
    });
    if (info) focused.push(info);
  }
  findings.keyboard = {
    elementsFocused: focused.length,
    withoutVisibleFocus: focused.filter(f => !f.hasVisibleFocus).length,
    sample: focused.slice(0, 10),
  };
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '09-keyboard-30tab.png'),
    fullPage: false,
  });
});

test('AUDIT 10 — Network throttling 4G (Slow 4G)', async ({ page }) => {
  test.setTimeout(90_000);
  await loginDemo(page);

  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: (4 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const t0 = Date.now();
  await page.goto('/dashboard', { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  const tDcl = Date.now() - t0;
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const tIdle = Date.now() - t0;

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '10-throttled-4g.png'),
    fullPage: false,
  });

  const perfMetrics4g = await page.evaluate(() => {
    const paints = performance.getEntriesByType('paint');
    return {
      firstPaint: paints.find(p => p.name === 'first-paint')?.startTime ?? null,
      firstContentfulPaint:
        paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? null,
    };
  });

  findings.throttled4g = { tDcl, tIdle, ...perfMetrics4g };
});
