/**
 * TypeScript gate: invoke `tsc --noEmit` scoped to the spec file.
 *
 * The legacy script ran tsc on the entire project, which let unrelated
 * upstream errors pollute the gate. We use `--noEmit` with `--project`
 * pointing at the project's tsconfig but filter the diagnostics to the
 * spec path before deciding pass/fail.
 */

import { execa } from 'execa';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';
import type { GateConfig } from '../config/schema';
import { relative } from 'path';

export class TypeScriptGate implements Gate {
  readonly name = 'typescript';
  constructor(private readonly cfg: GateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return result('skipped', 'gate disabled', t0);
    }

    const { stdout, stderr, exitCode } = await execa(
      'npx',
      ['--no-install', 'tsc', '--noEmit', '--pretty', 'false'],
      {
        cwd: ctx.projectRoot,
        timeout: this.cfg.timeoutMs,
        reject: false,
        signal: ctx.signal,
      },
    );

    const all = (stdout + '\n' + stderr).split('\n');
    const rel = relative(ctx.projectRoot, ctx.specPath);
    const errors = all.filter((line) => line.includes(rel) && /error TS\d+/.test(line));

    if (exitCode !== 0 && errors.length === 0 && this.cfg.optional) {
      return result('not-applicable', 'tsc not configured', t0);
    }

    if (errors.length > 0) {
      return {
        gate: this.name,
        status: 'fail',
        message: `${errors.length} TypeScript error(s) in spec`,
        metrics: { errorCount: errors.length },
        durationMs: performance.now() - t0,
        feedback: errors.slice(0, 10).join('\n'),
      };
    }
    return result('pass', 'no TypeScript errors in spec', t0);
  }
}

function result(status: GateResult['status'], message: string, t0: number): GateResult {
  return { gate: 'typescript', status, message, durationMs: performance.now() - t0 };
}
