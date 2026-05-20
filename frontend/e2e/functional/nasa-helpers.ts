/**
 * NASA-Grade QA Helpers — extended layer over helpers.ts
 * Adds: performance measurement, axe-core, security checks, persistent bug log
 */
import { Page, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { bug, screenshot, Bug } from './helpers';

// ─── Persistent bug log ────────────────────────────────────────────────────
const REPORT_PATH = path.join(process.cwd(), 'e2e/functional/nasa-report.json');

export interface NasaReport {
  bugs: Bug[];
  performance: PerfEntry[];
  a11y: A11yEntry[];
  security: SecurityEntry[];
  lastUpdated: string;
}

export interface PerfEntry {
  url: string;
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  domLoad: number;
  fullLoad: number;
}

export interface A11yEntry {
  url: string;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  violations: { id: string; impact: string; description: string; nodes: number }[];
}

export interface SecurityEntry {
  url: string;
  missingHeaders: string[];
  cookieIssues: string[];
  xssReflected: boolean;
}

function loadReport(): NasaReport {
  if (fs.existsSync(REPORT_PATH)) {
    try { return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')); } catch { /* */ }
  }
  return { bugs: [], performance: [], a11y: [], security: [], lastUpdated: '' };
}

export function saveBugToReport(b: Bug): void {
  const r = loadReport();
  if (!r.bugs.find(x => x.id === b.id)) {
    r.bugs.push(b);
    r.lastUpdated = new Date().toISOString();
    fs.writeFileSync(REPORT_PATH, JSON.stringify(r, null, 2));
  }
}

export function savePerfEntry(e: PerfEntry): void {
  const r = loadReport();
  r.performance = r.performance.filter(x => x.url !== e.url);
  r.performance.push(e);
  r.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(r, null, 2));
}

export function saveA11yEntry(e: A11yEntry): void {
  const r = loadReport();
  r.a11y = r.a11y.filter(x => x.url !== e.url);
  r.a11y.push(e);
  r.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(r, null, 2));
}

export function saveSecurityEntry(e: SecurityEntry): void {
  const r = loadReport();
  r.security = r.security.filter(x => x.url !== e.url);
  r.security.push(e);
  r.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(r, null, 2));
}

export function getReport(): NasaReport { return loadReport(); }

// ─── Performance ───────────────────────────────────────────────────────────

export async function injectPerfObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__nasaPerf = { lcp: 0, fcp: 0, cls: 0, tbt: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          (window as any).__nasaPerf.lcp = e.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.name === 'first-contentful-paint') (window as any).__nasaPerf.fcp = e.startTime;
        }
      }).observe({ type: 'paint', buffered: true });
    } catch {}
    try {
      let cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!(e as any).hadRecentInput) cls += (e as any).value || 0;
        }
        (window as any).__nasaPerf.cls = cls;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });
}

export async function collectPerfMetrics(page: Page, url: string): Promise<PerfEntry> {
  await page.waitForTimeout(1500); // let LCP/CLS settle
  const nav = await page.evaluate((): any => {
    const entries = performance.getEntriesByType('navigation');
    if (!entries.length) return null;
    const n = entries[0] as PerformanceNavigationTiming;
    return {
      ttfb: Math.round(n.responseStart - n.requestStart),
      domLoad: Math.round(n.domContentLoadedEventEnd - n.startTime),
      fullLoad: Math.round(n.loadEventEnd - n.startTime),
    };
  });
  const perf = await page.evaluate(() => (window as any).__nasaPerf ?? { lcp: 0, fcp: 0, cls: 0 });
  const entry: PerfEntry = {
    url,
    ttfb: nav?.ttfb ?? 0,
    fcp: Math.round(perf.fcp),
    lcp: Math.round(perf.lcp),
    cls: Number((perf.cls || 0).toFixed(4)),
    domLoad: nav?.domLoad ?? 0,
    fullLoad: nav?.fullLoad ?? 0,
  };
  savePerfEntry(entry);
  return entry;
}

// NASA thresholds — flag as bugs if exceeded
const PERF_THRESHOLDS = { ttfb: 600, fcp: 1500, lcp: 2500, cls: 0.1 };

export function checkPerfThresholds(entry: PerfEntry, moduleName: string): void {
  if (entry.ttfb > PERF_THRESHOLDS.ttfb) {
    bug({ module: moduleName, url: entry.url, action: 'Performance: TTFB', expected: `TTFB < ${PERF_THRESHOLDS.ttfb}ms`, observed: `TTFB = ${entry.ttfb}ms`, severity: 'MEDIO', reproSteps: [`Naviga a ${entry.url}`, 'Misura TTFB'] });
  }
  if (entry.fcp > 0 && entry.fcp > PERF_THRESHOLDS.fcp) {
    bug({ module: moduleName, url: entry.url, action: 'Performance: FCP', expected: `FCP < ${PERF_THRESHOLDS.fcp}ms`, observed: `FCP = ${entry.fcp}ms`, severity: 'MEDIO', reproSteps: [`Naviga a ${entry.url}`, 'Misura FCP'] });
  }
  if (entry.lcp > 0 && entry.lcp > PERF_THRESHOLDS.lcp) {
    bug({ module: moduleName, url: entry.url, action: 'Performance: LCP', expected: `LCP < ${PERF_THRESHOLDS.lcp}ms`, observed: `LCP = ${entry.lcp}ms`, severity: 'MEDIO', reproSteps: [`Naviga a ${entry.url}`, 'Misura LCP'] });
  }
  if (entry.cls > PERF_THRESHOLDS.cls) {
    bug({ module: moduleName, url: entry.url, action: 'Performance: CLS', expected: `CLS < ${PERF_THRESHOLDS.cls}`, observed: `CLS = ${entry.cls}`, severity: 'MEDIO', reproSteps: [`Naviga a ${entry.url}`, 'Osserva layout shift'] });
  }
}

// ─── Accessibility ─────────────────────────────────────────────────────────

export async function runAxeCheck(page: Page, url: string, moduleName: string): Promise<A11yEntry> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const entry: A11yEntry = {
    url,
    critical: results.violations.filter(v => v.impact === 'critical').length,
    serious: results.violations.filter(v => v.impact === 'serious').length,
    moderate: results.violations.filter(v => v.impact === 'moderate').length,
    minor: results.violations.filter(v => v.impact === 'minor').length,
    violations: results.violations.map(v => ({
      id: v.id,
      impact: v.impact ?? 'unknown',
      description: v.description,
      nodes: v.nodes.length,
    })),
  };
  saveA11yEntry(entry);

  // Only flag critical/serious as bugs
  for (const v of results.violations.filter(x => x.impact === 'critical' || x.impact === 'serious')) {
    bug({
      module: moduleName,
      url,
      action: `A11y: ${v.id}`,
      expected: `Nessuna violazione WCAG 2.2 AA di tipo ${v.impact}`,
      observed: `${v.description} (${v.nodes.length} nodi)`,
      severity: v.impact === 'critical' ? 'CRITICO' : 'ALTO',
      reproSteps: [`Naviga a ${url}`, `Esegui axe-core`, `Violazione: ${v.id}`],
    });
  }
  return entry;
}

// ─── Security Headers ──────────────────────────────────────────────────────

const REQUIRED_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'content-security-policy',
];

const RECOMMENDED_HEADERS = [
  'strict-transport-security',
  'referrer-policy',
  'permissions-policy',
];

export function checkSecurityHeaders(
  url: string,
  headers: Record<string, string>,
  moduleName: string
): SecurityEntry {
  const missing: string[] = [];
  for (const h of REQUIRED_HEADERS) {
    if (!headers[h]) missing.push(h);
  }
  const entry: SecurityEntry = { url, missingHeaders: missing, cookieIssues: [], xssReflected: false };
  saveSecurityEntry(entry);

  if (missing.length > 0) {
    bug({
      module: moduleName,
      url,
      action: 'Security: header mancanti',
      expected: `Header di sicurezza presenti: ${REQUIRED_HEADERS.join(', ')}`,
      observed: `Header mancanti: ${missing.join(', ')}`,
      severity: missing.includes('content-security-policy') ? 'ALTO' : 'MEDIO',
      reproSteps: [`curl -I ${url}`, 'Verifica header risposta'],
    });
  }
  return entry;
}

export function checkCookieFlags(
  url: string,
  cookies: Array<{ name: string; httpOnly?: boolean; secure?: boolean; sameSite?: string }>,
  moduleName: string
): void {
  for (const c of cookies.filter(x => x.name === 'auth_token' || x.name === 'refresh_token')) {
    const issues: string[] = [];
    if (!c.httpOnly) issues.push('non-httpOnly');
    if (!c.secure) issues.push('non-Secure');
    if (!c.sameSite || c.sameSite === 'None') issues.push(`SameSite=${c.sameSite ?? 'missing'}`);
    if (issues.length > 0) {
      bug({
        module: moduleName,
        url,
        action: `Security: cookie "${c.name}" flag mancanti`,
        expected: `Cookie ${c.name} deve avere httpOnly, Secure, SameSite=Strict/Lax`,
        observed: `Issues: ${issues.join(', ')}`,
        severity: 'ALTO',
        reproSteps: [`Login a ${url}`, `Ispeziona cookie ${c.name}`, `Verifica flag`],
      });
    }
  }
}

// ─── Form helpers ──────────────────────────────────────────────────────────

export const XSS_PAYLOADS = [
  '<script>window.__xss=1</script>',
  '<img src=x onerror="window.__xss=2">',
  '"><svg onload="window.__xss=3">',
];

export const SQLI_PAYLOADS = [
  "'; DROP TABLE customers; --",
  "1' OR '1'='1",
  "1; SELECT * FROM users--",
];

export const BOUNDARY_STRINGS = {
  empty: '',
  single: 'a',
  max255: 'a'.repeat(255),
  max10k: 'a'.repeat(10000),
  unicode: 'Ñoño García 日本語 Ελληνικά',
  emoji: '😀💪🚀🔥🏆',
  special: '!@#$%^&*()_+-=[]{}|;\':",./<>?',
  nullByte: 'test\x00value',
  newline: 'line1\nline2\r\nline3',
};

export async function testXssReflection(page: Page, url: string, inputSelector: string, moduleName: string): Promise<boolean> {
  await page.evaluate(() => { (window as any).__xss = 0; });
  const input = page.locator(inputSelector).first();
  if (!(await input.isVisible().catch(() => false))) return false;

  for (const payload of XSS_PAYLOADS) {
    await input.clear();
    await input.fill(payload);
    await page.waitForTimeout(200);
    const xssTriggered = await page.evaluate(() => (window as any).__xss > 0);
    if (xssTriggered) {
      bug({
        module: moduleName,
        url,
        action: 'Security: XSS reflected',
        expected: 'Input XSS non eseguito/riflesso',
        observed: `Payload eseguito: ${payload.substring(0, 50)}`,
        severity: 'CRITICO',
        reproSteps: [`Vai a ${url}`, `Inserisci "${payload}" nel campo`, 'Osserva esecuzione script'],
      });
      return true;
    }
  }
  return false;
}

// ─── Double-submit protection ───────────────────────────────────────────────

export async function testDoubleSubmit(page: Page, url: string, submitSelector: string, moduleName: string): Promise<void> {
  const btn = page.locator(submitSelector).first();
  if (!(await btn.isVisible().catch(() => false))) return;

  // Click twice rapidly
  await btn.click({ delay: 0 });
  await btn.click({ delay: 0 });
  await page.waitForTimeout(300);

  // Check if button is disabled after first click (double-submit protection)
  const isDisabled = await btn.isDisabled().catch(() => false);
  const isLoading = await page.locator('[aria-busy="true"], [class*="loading"]').first().isVisible().catch(() => false);

  if (!isDisabled && !isLoading) {
    bug({
      module: moduleName,
      url,
      action: 'Double-submit: protezione mancante',
      expected: 'Pulsante disabilitato/loading dopo primo click per prevenire doppio invio',
      observed: 'Pulsante rimane attivo dopo doppio click rapido (possibile doppio invio)',
      severity: 'MEDIO',
      reproSteps: [`Vai a ${url}`, 'Clicca submit due volte rapidamente', 'Osserva se pulsante si disabilita'],
    });
  }
}
