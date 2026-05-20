/**
 * Coverage gate scoped to ONE source file.
 *
 * Bug in legacy script: it ran `jest --coverage --collectCoverageFrom=src/<module>`
 * which produced module-wide coverage even for a single file's spec —
 * misleadingly inflated numbers when other files imported the target.
 *
 * Fix: we narrow `--collectCoverageFrom` to the exact file path and
 * read `coverage-summary.json` (jest's `json-summary` reporter) to
 * extract the file's own coverage row, ignoring everything else.
 */

import { execa } from 'execa';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';

export interface CoverageGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  statementsThreshold: number;
  branchesThreshold: number;
  functionsThreshold: number;
  linesThreshold: number;
}

export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export class CoverageGate implements Gate {
  readonly name = 'coverage';
  constructor(private readonly cfg: CoverageGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const relSource = relative(ctx.projectRoot, ctx.sourcePath);
    const outDir = join(ctx.projectRoot, '.coverage-fix-coverage', sanitize(relSource));

    const args = [
      '--no-install',
      'jest',
      ctx.specPath,
      '--coverage',
      `--coverageDirectory=${outDir}`,
      `--collectCoverageFrom=${relSource}`,
      '--coverageReporters=json-summary',
      '--coverageReporters=text-summary',
      '--coverageThreshold={}',
      '--silent',
      '--forceExit',
    ];

    const { exitCode, stderr, stdout } = await execa('npx', args, {
      cwd: ctx.projectRoot,
      timeout: this.cfg.timeoutMs,
      reject: false,
      signal: ctx.signal,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    if (exitCode !== 0) {
      return {
        gate: this.name,
        status: 'fail',
        message: 'jest failed',
        durationMs: performance.now() - t0,
        feedback: tail(stderr || stdout, 1500),
      };
    }

    const summary = readSummary(outDir);
    if (!summary) {
      return {
        gate: this.name,
        status: 'fail',
        message: 'coverage summary not produced',
        durationMs: performance.now() - t0,
      };
    }

    const fileMetrics = pickFileMetrics(summary, ctx.sourcePath, ctx.projectRoot);
    if (!fileMetrics) {
      return {
        gate: this.name,
        status: 'fail',
        message: `target file not found in coverage summary (${relSource})`,
        durationMs: performance.now() - t0,
      };
    }

    const failures: string[] = [];
    if (fileMetrics.statements < this.cfg.statementsThreshold) failures.push(`statements ${fileMetrics.statements}% < ${this.cfg.statementsThreshold}%`);
    if (fileMetrics.branches < this.cfg.branchesThreshold) failures.push(`branches ${fileMetrics.branches}% < ${this.cfg.branchesThreshold}%`);
    if (fileMetrics.functions < this.cfg.functionsThreshold) failures.push(`functions ${fileMetrics.functions}% < ${this.cfg.functionsThreshold}%`);
    if (fileMetrics.lines < this.cfg.linesThreshold) failures.push(`lines ${fileMetrics.lines}% < ${this.cfg.linesThreshold}%`);

    if (failures.length > 0) {
      return {
        gate: this.name,
        status: 'fail',
        message: failures.join(', '),
        metrics: fileMetrics as unknown as Record<string, number>,
        durationMs: performance.now() - t0,
        feedback: failures.join('\n'),
      };
    }

    return {
      gate: this.name,
      status: 'pass',
      message: `statements ${fileMetrics.statements}%, branches ${fileMetrics.branches}%`,
      metrics: fileMetrics as unknown as Record<string, number>,
      durationMs: performance.now() - t0,
    };
  }
}

interface JestSummary {
  total: { [k: string]: { pct: number } };
  [filePath: string]: unknown;
}

function readSummary(dir: string): JestSummary | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'coverage-summary.json'), 'utf8')) as JestSummary;
  } catch {
    return null;
  }
}

function pickFileMetrics(summary: JestSummary, sourcePath: string, root: string): CoverageMetrics | null {
  const candidates = [sourcePath, relative(root, sourcePath), `./${relative(root, sourcePath)}`];
  for (const key of Object.keys(summary)) {
    if (candidates.includes(key) || key.endsWith(relative(root, sourcePath))) {
      const row = summary[key] as { statements: { pct: number }; branches: { pct: number }; functions: { pct: number }; lines: { pct: number } };
      return {
        statements: row.statements.pct,
        branches: row.branches.pct,
        functions: row.functions.pct,
        lines: row.lines.pct,
      };
    }
  }
  return null;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '_');
}

function tail(s: string, n: number): string {
  return s.length <= n ? s : s.slice(-n);
}
