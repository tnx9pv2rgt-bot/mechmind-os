/**
 * Call verification gate.
 *
 * The legacy script demanded `toHaveBeenCalled` for every test, which
 * produced false positives for pure unit tests that don't use mocks
 * (e.g. testing a pure function's return value). We require it ONLY
 * for tests that demonstrably interact with mocks, and we count
 * coverage by test, not by total occurrence.
 */

import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';
import { analyzeSpec } from '../ast/analyzer';

export interface CallsGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  requireOnlyWhenMocksPresent: boolean;
}

export class CallsGate implements Gate {
  readonly name = 'calls';
  constructor(private readonly cfg: CallsGateConfig) {}

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

    const required = this.cfg.requireOnlyWhenMocksPresent ? m.testsWithMockUsage : m.testCount;
    const covered = m.testsWithCallVerification;

    if (required === 0) {
      return {
        gate: this.name,
        status: 'pass',
        message: 'no mock usage; call verification not required',
        metrics: { tests: m.testCount, mockedTests: 0 },
        durationMs: performance.now() - t0,
      };
    }

    if (covered < required) {
      return {
        gate: this.name,
        status: 'fail',
        message: `${covered}/${required} mocked tests verify calls`,
        metrics: { tests: m.testCount, mockedTests: required, coveredTests: covered },
        durationMs: performance.now() - t0,
        feedback: `${required - covered} mocked test(s) lack toHaveBeenCalled* assertions.`,
      };
    }
    return {
      gate: this.name,
      status: 'pass',
      message: `${covered}/${required} mocked tests verify calls`,
      metrics: { tests: m.testCount, mockedTests: required, coveredTests: covered },
      durationMs: performance.now() - t0,
    };
  }
}
