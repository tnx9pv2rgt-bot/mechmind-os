import { execa } from 'execa';
import { performance } from 'perf_hooks';
import { Gate, GateContext, GateResult } from './types';

export interface EslintGateConfig {
  enabled: boolean;
  timeoutMs: number;
  optional: boolean;
  maxWarnings: number;
}

export class EslintGate implements Gate {
  readonly name = 'eslint';
  constructor(private readonly cfg: EslintGateConfig) {}

  async run(ctx: GateContext): Promise<GateResult> {
    const t0 = performance.now();
    if (!this.cfg.enabled) {
      return { gate: this.name, status: 'skipped', message: 'gate disabled', durationMs: performance.now() - t0 };
    }

    const { stdout, exitCode } = await execa(
      'npx',
      ['--no-install', 'eslint', '--no-color', '--format', 'json', '--max-warnings', String(this.cfg.maxWarnings), ctx.specPath],
      { cwd: ctx.projectRoot, timeout: this.cfg.timeoutMs, reject: false, signal: ctx.signal },
    );

    if (exitCode === 127 || /not found/i.test(stdout)) {
      return {
        gate: this.name,
        status: this.cfg.optional ? 'not-applicable' : 'fail',
        message: 'ESLint not installed',
        durationMs: performance.now() - t0,
      };
    }

    let parsed: Array<{ errorCount: number; warningCount: number; messages: Array<{ ruleId: string; message: string; line: number }> }> = [];
    try {
      parsed = JSON.parse(stdout || '[]');
    } catch {
      return {
        gate: this.name,
        status: 'fail',
        message: 'ESLint output unparseable',
        durationMs: performance.now() - t0,
        feedback: stdout.slice(0, 1000),
      };
    }

    const errorCount = parsed.reduce((sum, f) => sum + f.errorCount, 0);
    const warningCount = parsed.reduce((sum, f) => sum + f.warningCount, 0);
    const overWarnings = warningCount > this.cfg.maxWarnings;

    if (errorCount > 0 || overWarnings) {
      const feedback = parsed
        .flatMap((f) => f.messages.slice(0, 5).map((m) => `${m.line}: ${m.ruleId} — ${m.message}`))
        .slice(0, 10)
        .join('\n');
      return {
        gate: this.name,
        status: 'fail',
        message: `${errorCount} error(s), ${warningCount} warning(s)`,
        metrics: { errorCount, warningCount },
        durationMs: performance.now() - t0,
        feedback,
      };
    }
    return { gate: this.name, status: 'pass', message: 'no lint errors', metrics: { errorCount, warningCount }, durationMs: performance.now() - t0 };
  }
}
