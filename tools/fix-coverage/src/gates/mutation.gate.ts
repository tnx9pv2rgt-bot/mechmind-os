/**
 * Mutation testing gate (optional). Runs Stryker scoped to the source
 * file. If Stryker is not installed and `optional` is true, the gate
 * returns `not-applicable` rather than `pass` — the legacy script
 * silently treated missing tools as success.
 */

import { execa } from 'execa';
import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';

export interface MutationGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  threshold: number;
}

export class MutationGate implements Gate {
  readonly name = 'mutation';
  constructor(private readonly cfg: MutationGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const relSource = relative(ctx.projectRoot, ctx.sourcePath);
    const reportDir = join(ctx.projectRoot, '.stryker-tmp', sanitize(relSource));

    const { exitCode, stderr } = await execa(
      'npx',
      [
        '--no-install',
        'stryker',
        'run',
        '--mutate',
        relSource,
        '--testRunner',
        'jest',
        '--reporters',
        'json',
        '--htmlReporter.fileName',
        join(reportDir, 'mutation.html'),
      ],
      {
        cwd: ctx.projectRoot,
        timeout: this.cfg.timeoutMs,
        reject: false,
        signal: ctx.signal,
      },
    );

    if (exitCode === 127 || /not found|Cannot find module/i.test(stderr)) {
      return {
        gate: this.name,
        status: this.cfg.optional ? 'not-applicable' : 'fail',
        message: 'Stryker not installed',
        durationMs: performance.now() - t0,
      };
    }

    const score = readMutationScore(ctx.projectRoot);
    if (score === null) {
      return {
        gate: this.name,
        status: 'fail',
        message: 'mutation report not produced',
        durationMs: performance.now() - t0,
      };
    }

    if (score < this.cfg.threshold) {
      return {
        gate: this.name,
        status: 'fail',
        message: `mutation score ${score}% < ${this.cfg.threshold}%`,
        metrics: { score },
        durationMs: performance.now() - t0,
      };
    }
    return {
      gate: this.name,
      status: 'pass',
      message: `mutation score ${score}%`,
      metrics: { score },
      durationMs: performance.now() - t0,
    };
  }
}

function readMutationScore(root: string): number | null {
  const candidates = ['reports/mutation/mutation.json', 'reports/mutation/mutation-report.json'];
  for (const c of candidates) {
    const p = join(root, c);
    if (!existsSync(p)) continue;
    try {
      const data = JSON.parse(readFileSync(p, 'utf8')) as { mutationScore?: number };
      if (typeof data.mutationScore === 'number') return data.mutationScore;
    } catch {
      // try next
    }
  }
  return null;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '_');
}
