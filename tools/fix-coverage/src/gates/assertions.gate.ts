/**
 * Assertion density gate. Uses the AST analyzer instead of grep so we
 * don't count `expect(` inside string literals.
 */

import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';
import { analyzeSpec } from '../ast/analyzer';

export interface AssertionsGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  minPerTest: number;
}

export class AssertionsGate implements Gate {
  readonly name = 'assertions';
  constructor(private readonly cfg: AssertionsGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const text = readFileSync(ctx.specPath, 'utf8');
    const m = analyzeSpec(text);

    if (m.testCount === 0) {
      return {
        gate: this.name,
        status: 'fail',
        message: 'no test blocks found',
        durationMs: performance.now() - t0,
      };
    }
    const avg = m.assertionCount / m.testCount;
    if (avg < this.cfg.minPerTest) {
      return {
        gate: this.name,
        status: 'fail',
        message: `avg ${avg.toFixed(2)} assertions/test < ${this.cfg.minPerTest}`,
        metrics: { tests: m.testCount, assertions: m.assertionCount, avg },
        durationMs: performance.now() - t0,
        feedback: `Add at least ${Math.ceil((this.cfg.minPerTest - avg) * m.testCount)} more expect(...) calls.`,
      };
    }
    return {
      gate: this.name,
      status: 'pass',
      message: `avg ${avg.toFixed(2)} assertions/test`,
      metrics: { tests: m.testCount, assertions: m.assertionCount, avg },
      durationMs: performance.now() - t0,
    };
  }
}
