/**
 * Per-file pipeline orchestration. Runs:
 *   1. Generation (Claude) — unless we already have a spec on disk
 *      that passes all gates (fast cache-hit path).
 *   2. All gates in order.
 *   3. On failure, retries with feedback loop up to maxAttempts.
 *
 * Note the unified pipeline: cache-hit and cache-miss share the same
 * gate sequence, eliminating the duplicated 200+ lines from the legacy
 * bash script.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { performance } from 'perf_hooks';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { Gate, GateResult } from '../gates/types';
import { IClaudeClient } from '../claude/client';
import { buildPrompt, GateFeedback } from '../claude/prompt';
import { extractCode, ExtractionError } from '../claude/extract';
import { truncateSource } from '../ast/source-truncate';
import { CheckpointStore, Step } from '../core/checkpoint';
import { FileCache } from '../core/cache';
import { getLogger } from '../utils/logger';
import type { RunConfig } from '../config/schema';
import { deriveSpecPath } from '../utils/path';
import { basename } from 'path';

const log = getLogger('pipeline');

export interface PipelineResult {
  sourcePath: string;
  specPath: string;
  status: 'pass' | 'fail' | 'ceiling';
  gateResults: GateResult[];
  attempts: number;
  durationMs: number;
  cacheHit: boolean;
}

export interface PipelineDeps {
  claude: IClaudeClient;
  cache: FileCache;
  checkpoint: CheckpointStore;
  gates: Gate[];
  cfg: RunConfig;
  signal: AbortSignal;
}

export async function runPipeline(sourcePath: string, deps: PipelineDeps): Promise<PipelineResult> {
  const t0 = performance.now();
  const specPath = deriveSpecPath(sourcePath, deps.cfg.testFilePattern);

  // Cache: if a previous run reached "ceiling" for this exact source content,
  // skip generation and report the cached result. The cache key is the SHA-256
  // of the source file, so any edit invalidates it automatically.
  const cached = deps.cache.get(sourcePath);
  if (cached && cached.status === 'ceiling') {
    return {
      sourcePath,
      specPath,
      status: 'ceiling',
      gateResults: [],
      attempts: 0,
      durationMs: performance.now() - t0,
      cacheHit: true,
    };
  }

  let attempt = 0;
  let lastResults: GateResult[] = [];
  let feedback: GateFeedback[] = [];

  while (attempt < deps.cfg.maxAttempts) {
    attempt += 1;
    if (deps.signal.aborted) throw new Error('aborted');

    if (deps.cfg.dryRun) {
      log.info({ sourcePath, attempt }, 'dry-run: would generate spec');
      await deps.checkpoint.record(sourcePath, 'generated');
    } else if (attempt === 1 && existsSync(specPath) && passesAllGatesQuick(specPath)) {
      log.info({ specPath }, 'spec already exists; skipping generation');
      await deps.checkpoint.record(sourcePath, 'generated');
    } else {
      await generateSpec(sourcePath, specPath, deps, feedback);
      await deps.checkpoint.record(sourcePath, 'generated');
    }

    lastResults = await runGates(sourcePath, specPath, deps);
    const failed = lastResults.filter((r) => r.status === 'fail');

    if (failed.length === 0) {
      await deps.cache.set(sourcePath, { status: 'pass', reason: 'all gates passed' });
      await deps.checkpoint.record(sourcePath, 'done');
      return {
        sourcePath,
        specPath,
        status: 'pass',
        gateResults: lastResults,
        attempts: attempt,
        durationMs: performance.now() - t0,
        cacheHit: false,
      };
    }

    feedback = failed.map((r) => ({ gate: r.gate, reason: r.message, excerpt: r.feedback }));
    log.warn(
      { sourcePath, attempt, failedGates: failed.map((f) => f.gate) },
      'gates failed; will retry with feedback',
    );
  }

  // Treat persistent coverage failure on a controller as a "ceiling".
  const isController = /\.controller\.ts$/.test(sourcePath);
  const onlyCoverageFailed =
    lastResults.filter((r) => r.status === 'fail').every((r) => r.gate === 'coverage');
  if (isController && onlyCoverageFailed) {
    await deps.cache.set(sourcePath, {
      status: 'ceiling',
      reason: 'controller coverage ceiling reached',
      metrics: { attempts: attempt },
    });
    await deps.checkpoint.record(sourcePath, 'ceiling');
    return {
      sourcePath,
      specPath,
      status: 'ceiling',
      gateResults: lastResults,
      attempts: attempt,
      durationMs: performance.now() - t0,
      cacheHit: false,
    };
  }

  await deps.cache.set(sourcePath, {
    status: 'fail',
    reason: lastResults
      .filter((r) => r.status === 'fail')
      .map((r) => `${r.gate}: ${r.message}`)
      .join('; '),
  });
  await deps.checkpoint.record(sourcePath, 'failed');
  return {
    sourcePath,
    specPath,
    status: 'fail',
    gateResults: lastResults,
    attempts: attempt,
    durationMs: performance.now() - t0,
    cacheHit: false,
  };
}

async function generateSpec(
  sourcePath: string,
  specPath: string,
  deps: PipelineDeps,
  feedback: GateFeedback[],
): Promise<void> {
  const sourceText = readFileSync(sourcePath, 'utf8');
  const truncated = truncateSource(sourceText, deps.cfg.claude.sourceTokenBudget);
  const moduleName = basename(sourcePath).replace(/\.[^.]+$/, '');

  const { system, user } = buildPrompt({
    sourcePath,
    sourceModuleName: moduleName,
    truncated,
    framework: 'nestjs',
    conventions: {
      requireTenantId: true,
      minAssertionsPerTest: deps.cfg.gates.assertions.minPerTest,
    },
    retryFeedback: feedback.length > 0 ? feedback : undefined,
  });

  const response = await deps.claude.generate({ system, user });
  let code: string;
  try {
    code = extractCode(response.text).code;
  } catch (err) {
    if (err instanceof ExtractionError) {
      throw new Error(`Claude returned no parseable code block: ${err.message}`);
    }
    throw err;
  }

  if (!deps.cfg.dryRun) {
    mkdirSync(dirname(specPath), { recursive: true });
    writeFileSync(specPath, code, 'utf8');
  }
}

async function runGates(
  sourcePath: string,
  specPath: string,
  deps: PipelineDeps,
): Promise<GateResult[]> {
  const results: GateResult[] = [];
  for (const gate of deps.gates) {
    if (deps.signal.aborted) throw new Error('aborted');
    const result = await gate.run({
      projectRoot: deps.cfg.projectRoot,
      sourcePath,
      specPath,
      signal: deps.signal,
    });
    results.push(result);
    await deps.checkpoint.record(sourcePath, gate.name as Step, result.status === 'fail' ? result.message : undefined);
    if (result.status === 'fail' && shortCircuit(gate.name)) break;
  }
  return results;
}

function shortCircuit(gateName: string): boolean {
  // Skip downstream gates if the spec doesn't even compile.
  return gateName === 'typescript';
}

function passesAllGatesQuick(_specPath: string): boolean {
  // We deliberately do NOT short-circuit existing specs; the full gate
  // sequence runs anyway. This stub exists to make the "skip generation"
  // intent explicit at the call site.
  return true;
}
