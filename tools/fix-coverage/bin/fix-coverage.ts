#!/usr/bin/env node
/**
 * fix-coverage CLI.
 *
 * Examples:
 *   fix-coverage --project ./backend --globs 'src/booking/*.service.ts'
 *   fix-coverage --project . --config fix-coverage.config.json
 *   fix-coverage --project . --globs 'src/**\/*.service.ts' --dry-run
 *   fix-coverage --project . --globs 'src/...' --resume false --parallelism 4
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseRunConfig, runOrchestrator } from '../src';
import { getLogger } from '../src/utils/logger';

const log = getLogger('cli');

function fail(msg: string): never {
  process.stderr.write(`fix-coverage: ${msg}\n`);
  process.exit(2);
}

async function main(): Promise<void> {
  const program = new Command()
    .name('fix-coverage')
    .description('World-class test generation orchestrator with 8 quality gates')
    .version('1.0.0')
    .option('-p, --project <path>', 'project root directory', process.cwd())
    .option('-g, --globs <glob...>', 'source file globs (relative to project root)')
    .option('-c, --config <path>', 'path to JSON config file')
    .option('--parallelism <n>', 'concurrent file pipelines', (v) => parseInt(v, 10))
    .option('--max-attempts <n>', 'max retries per file', (v) => parseInt(v, 10))
    .option('--no-resume', 'ignore existing checkpoint and reprocess all files')
    .option('--dry-run', 'simulate the pipeline without calling Claude or writing specs')
    .option('--model <name>', 'Claude model id')
    .option('--no-markdown', 'disable markdown reporter')
    .option('--no-json', 'disable JSON reporter')
    .option('--no-junit', 'disable JUnit reporter');

  program.parse(process.argv);
  const opts = program.opts<{
    project: string;
    globs?: string[];
    config?: string;
    parallelism?: number;
    maxAttempts?: number;
    resume: boolean;
    dryRun?: boolean;
    model?: string;
    markdown: boolean;
    json: boolean;
    junit: boolean;
  }>();

  let raw: Record<string, unknown> = {};
  if (opts.config) {
    const cfgPath = resolve(opts.config);
    if (!existsSync(cfgPath)) fail(`config not found: ${cfgPath}`);
    raw = JSON.parse(readFileSync(cfgPath, 'utf8'));
  }

  raw.projectRoot = resolve(opts.project);
  if (opts.globs && opts.globs.length > 0) raw.sourceGlobs = opts.globs;
  if (!Array.isArray(raw.sourceGlobs) || raw.sourceGlobs.length === 0) {
    fail('at least one --globs argument or sourceGlobs in config is required');
  }
  if (opts.parallelism !== undefined) raw.parallelism = opts.parallelism;
  if (opts.maxAttempts !== undefined) raw.maxAttempts = opts.maxAttempts;
  if (opts.resume === false) raw.resume = false;
  if (opts.dryRun) raw.dryRun = true;
  raw.reporters = {
    ...(raw.reporters as Record<string, unknown> | undefined),
    markdown: opts.markdown,
    json: opts.json,
    junit: opts.junit,
  };
  if (opts.model) {
    raw.claude = { ...(raw.claude as Record<string, unknown> | undefined), model: opts.model };
  }

  let cfg;
  try {
    cfg = parseRunConfig(raw);
  } catch (err) {
    fail(`invalid configuration: ${(err as Error).message}`);
  }

  try {
    const report = await runOrchestrator({ cfg });
    log.info(report.totals, 'run complete');
    process.stdout.write(
      `\n${'='.repeat(60)}\n` +
        `total ${report.totals.total} • pass ${report.totals.pass} • ceiling ${report.totals.ceiling} • fail ${report.totals.fail}\n` +
        `${'='.repeat(60)}\n`,
    );
    if (report.reportPaths.json) process.stdout.write(`json:     ${report.reportPaths.json}\n`);
    if (report.reportPaths.junit) process.stdout.write(`junit:    ${report.reportPaths.junit}\n`);
    if (report.reportPaths.markdown) process.stdout.write(`markdown: ${report.reportPaths.markdown}\n`);
    process.exit(report.totals.fail > 0 ? 1 : 0);
  } catch (err) {
    log.error({ err }, 'fatal');
    fail((err as Error).message);
  }
}

void main();
