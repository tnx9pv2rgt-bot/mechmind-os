import type { RunConfig } from '../config/schema';
import type { Gate } from './types';
import { TypeScriptGate } from './typescript.gate';
import { EslintGate } from './eslint.gate';
import { CoverageGate } from './coverage.gate';
import { FlakinessGate } from './flakiness.gate';
import { MutationGate } from './mutation.gate';
import { AssertionsGate } from './assertions.gate';
import { MocksGate } from './mocks.gate';
import { CallsGate } from './calls.gate';

/**
 * The pipeline executes gates in this order. Cheap static checks run
 * first so we fail fast before spending time on jest/coverage runs.
 */
export function buildPipeline(cfg: RunConfig): Gate[] {
  return [
    new TypeScriptGate(cfg.gates.typescript),
    new EslintGate(cfg.gates.eslint),
    new AssertionsGate(cfg.gates.assertions),
    new MocksGate(cfg.gates.mocks),
    new CallsGate(cfg.gates.calls),
    new CoverageGate(cfg.gates.coverage),
    new FlakinessGate(cfg.gates.flakiness),
    new MutationGate(cfg.gates.mutation),
  ];
}

export * from './types';
