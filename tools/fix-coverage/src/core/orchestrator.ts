/**
 * Top-level orchestrator. Wires:
 *   - dependency check
 *   - module discovery
 *   - resume detection (checkpoint)
 *   - bounded concurrency execution
 *   - reporters
 *   - graceful shutdown
 */

import { performance } from 'perf_hooks';
import type { RunConfig } from '../config/schema';
import { discoverFiles } from '../runner/module-discovery';
import { runPool } from '../runner/pool';
import { runPipeline, PipelineResult } from '../runner/pipeline';
import { CheckpointStore } from './checkpoint';
import { FileCache } from './cache';
import { ClaudeClient, FakeClaudeClient, IClaudeClient } from '../claude/client';
import { buildPipeline } from '../gates';
import { appendMarkdown } from '../reporters/markdown';
import { writeJsonReport } from '../reporters/json';
import { writeJunitReport } from '../reporters/junit';
import { onShutdown } from '../utils/signal';
import { getLogger } from '../utils/logger';
import { checkDependencies, assertRequiredDependencies } from '../utils/deps';
import { join } from 'path';

const log = getLogger('orchestrator');

export interface OrchestratorReport {
  results: PipelineResult[];
  totals: {
    total: number;
    pass: number;
    ceiling: number;
    fail: number;
    durationMs: number;
  };
  reportPaths: { json?: string; junit?: string; markdown?: string };
}

export interface OrchestratorOptions {
  cfg: RunConfig;
  claude?: IClaudeClient;
}

export async function runOrchestrator(opts: OrchestratorOptions): Promise<OrchestratorReport> {
  const { cfg } = opts;
  const t0 = performance.now();
  log.info({ cfg: { ...cfg, claude: { ...cfg.claude, apiKey: '<redacted>' } } }, 'starting');

  const deps = await checkDependencies();
  assertRequiredDependencies(deps);

  const cacheDir = join(cfg.projectRoot, cfg.cacheDir);
  const reportDir = join(cfg.projectRoot, cfg.reportDir);

  const checkpoint = new CheckpointStore(cacheDir);
  const cache = new FileCache(cacheDir);

  const discovered = await discoverFiles({
    cwd: cfg.projectRoot,
    globs: cfg.sourceGlobs,
    maxBytes: 2 * 1024 * 1024,
  });
  log.info({ count: discovered.length }, 'files discovered');

  const targets = cfg.resume
    ? checkpoint.pendingFiles(discovered.map((d) => d.absolutePath))
    : discovered.map((d) => d.absolutePath);
  log.info({ pending: targets.length, total: discovered.length }, 'targets resolved');

  if (targets.length === 0) {
    return { results: [], totals: { total: 0, pass: 0, ceiling: 0, fail: 0, durationMs: 0 }, reportPaths: {} };
  }

  const claude: IClaudeClient = opts.claude ?? buildClaudeClient(cfg);

  onShutdown(async () => {
    await cache.flush();
    log.info('checkpoint flushed on shutdown');
  });

  const gates = buildPipeline(cfg);

  const tasks = targets.map((file) => ({
    id: file,
    fn: (signal: AbortSignal) =>
      runPipeline(file, { claude, cache, checkpoint, gates, cfg, signal }),
  }));

  const poolResults = await runPool(tasks, {
    concurrency: cfg.parallelism,
    globalTimeoutMs: cfg.globalTimeoutMs,
  });

  const results: PipelineResult[] = poolResults
    .map((r) => {
      if (r.ok && r.value) return r.value;
      log.error({ id: r.id, error: (r.error as Error)?.message }, 'pipeline error');
      return {
        sourcePath: r.id,
        specPath: r.id,
        status: 'fail' as const,
        gateResults: [],
        attempts: 0,
        durationMs: r.durationMs,
        cacheHit: false,
      };
    });

  const reportPaths: OrchestratorReport['reportPaths'] = {};
  if (cfg.reporters.markdown) {
    await appendMarkdown(
      { filePath: join(cfg.projectRoot, cfg.reporters.markdownPath), rotateLines: cfg.reporters.markdownRotateLines },
      results,
    );
    reportPaths.markdown = cfg.reporters.markdownPath;
  }
  if (cfg.reporters.json) {
    reportPaths.json = writeJsonReport(reportDir, results);
  }
  if (cfg.reporters.junit) {
    reportPaths.junit = writeJunitReport(reportDir, results);
  }

  const durationMs = performance.now() - t0;
  return {
    results,
    totals: {
      total: results.length,
      pass: results.filter((r) => r.status === 'pass').length,
      ceiling: results.filter((r) => r.status === 'ceiling').length,
      fail: results.filter((r) => r.status === 'fail').length,
      durationMs,
    },
    reportPaths,
  };
}

function buildClaudeClient(cfg: RunConfig): IClaudeClient {
  const apiKey = cfg.claude.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (cfg.dryRun) {
      log.warn('dry-run mode without API key; using fake Claude client');
      return new FakeClaudeClient(() => '```typescript\n// dry-run placeholder\n```');
    }
    throw new Error('ANTHROPIC_API_KEY is required (or set claude.apiKey in config)');
  }
  return new ClaudeClient({
    apiKey,
    model: cfg.claude.model,
    maxTokens: cfg.claude.maxTokens,
    temperature: cfg.claude.temperature,
    requestTimeoutMs: cfg.claude.requestTimeoutMs,
    maxRetries: cfg.claude.maxRetries,
    backoffBaseMs: cfg.claude.backoffBaseMs,
    backoffMaxMs: cfg.claude.backoffMaxMs,
  });
}
