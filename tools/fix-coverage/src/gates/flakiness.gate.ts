/**
 * Flakiness gate: run the spec N times in succession; require all
 * runs to pass. We run sequentially (not in parallel) to surface
 * order-dependent state pollution that parallel runs would mask.
 */

import { execa } from 'execa';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';

export interface FlakinessGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  runs: number;
}

export class FlakinessGate implements Gate {
  readonly name = 'flakiness';
  constructor(private readonly cfg: FlakinessGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const failures: number[] = [];
    for (let i = 0; i < this.cfg.runs; i += 1) {
      const { exitCode } = await execa(
        'npx',
        ['--no-install', 'jest', ctx.specPath, '--silent', '--forceExit', '--runInBand'],
        {
          cwd: ctx.projectRoot,
          timeout: this.cfg.timeoutMs,
          reject: false,
          signal: ctx.signal,
        },
      );
      if (exitCode !== 0) failures.push(i + 1);
    }

    if (failures.length === 0) {
      return {
        gate: this.name,
        status: 'pass',
        message: `${this.cfg.runs}/${this.cfg.runs} runs passed`,
        metrics: { runs: this.cfg.runs, failures: 0 },
        durationMs: performance.now() - t0,
      };
    }
    return {
      gate: this.name,
      status: 'fail',
      message: `flaky: failed runs ${failures.join(',')}/${this.cfg.runs}`,
      metrics: { runs: this.cfg.runs, failures: failures.length },
      durationMs: performance.now() - t0,
    };
  }
}
