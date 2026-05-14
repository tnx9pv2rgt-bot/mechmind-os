import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const BUGS: Bug[] = [];
export let BUG_COUNT = 0;

export interface Bug {
  id: number;
  module: string;
  url: string;
  action: string;
  expected: string;
  observed: string;
  severity: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BASSO';
  screenshot?: string;
  reproSteps: string[];
}

export function bug(b: Omit<Bug, 'id'>): Bug {
  BUG_COUNT++;
  const entry: Bug = { id: BUG_COUNT, ...b };
  BUGS.push(entry);
  console.error(`\n🐛 BUG #${entry.id} [${entry.severity}] ${entry.module}: ${entry.action}`);
  console.error(`   Expected: ${entry.expected}`);
  console.error(`   Observed: ${entry.observed}`);
  return entry;
}

export async function screenshot(page: Page, name: string): Promise<string> {
  const dir = path.join(process.cwd(), 'bug-reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name.replace(/[^a-z0-9-]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export async function goto(page: Page, path: string): Promise<number | null> {
  try {
    const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
    return resp?.status() ?? null;
  } catch (e) {
    return null;
  }
}

export async function waitForContent(page: Page, timeout = 8000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // ok, just domcontentloaded is enough
  }
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

export async function hasElement(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function getText(page: Page, selector: string): Promise<string> {
  try {
    return (await page.locator(selector).first().textContent()) ?? '';
  } catch {
    return '';
  }
}
