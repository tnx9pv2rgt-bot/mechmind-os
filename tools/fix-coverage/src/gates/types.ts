/**
 * Common types for quality gates. Each gate returns a structured
 * result; "skipped" is a first-class state distinct from "passed".
 */

export type GateStatus = 'pass' | 'fail' | 'skipped' | 'not-applicable';

export interface GateResult {
  gate: string;
  status: GateStatus;
  message: string;
  metrics?: Record<string, number | string | boolean>;
  durationMs: number;
  feedback?: string;
}

export interface GateContext {
  projectRoot: string;
  sourcePath: string;
  specPath: string;
  signal: AbortSignal;
}

export interface Gate {
  readonly name: string;
  run(ctx: GateContext): Promise<GateResult>;
}

export class GateExecutionError extends Error {
  constructor(
    public readonly gate: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${gate}] ${message}`);
  }
}
