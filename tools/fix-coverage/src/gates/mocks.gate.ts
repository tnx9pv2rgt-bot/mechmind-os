/**
 * Mock state management gate.
 *
 * Persistent mock variants (`mockResolvedValue`, etc.) used outside
 * `beforeEach` cause cross-test pollution. The legacy script grepped
 * for these patterns and produced false positives in comments and
 * strings. We use AST instead.
 */

import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';
import { analyzeSpec } from '../ast/analyzer';

export interface MocksGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
}

export class MocksGate implements Gate {
  readonly name = 'mocks';
  constructor(private readonly cfg: MocksGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const text = readFileSync(ctx.specPath, 'utf8');
    const m = analyzeSpec(text);

    if (m.persistentMockCount > 0) {
      return {
        gate: this.name,
        status: 'fail',
        message: `${m.persistentMockCount} persistent mock(s) outside beforeEach`,
        metrics: { persistentMocks: m.persistentMockCount },
        durationMs: performance.now() - t0,
        feedback: 'Replace mockResolvedValue/mockRejectedValue/mockReturnValue with the *Once variant outside beforeEach to avoid test pollution.',
      };
    }
    return {
      gate: this.name,
      status: 'pass',
      message: 'no persistent mocks outside beforeEach',
      metrics: { persistentMocks: 0 },
      durationMs: performance.now() - t0,
    };
  }
}
