/**
 * Configuration schema validated with Zod.
 *
 * All user input passes through this gate. Defaults are conservative:
 * gates are strict, parallelism is bounded, retries are bounded.
 */

import { z } from 'zod';

export const GateConfigSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(0).max(100).optional(),
  timeoutMs: z.number().int().positive().default(120_000),
  optional: z.boolean().default(false),
});

export const RunConfigSchema = z.object({
  projectRoot: z.string().min(1),
  sourceGlobs: z.array(z.string().min(1)).min(1),
  testFilePattern: z
    .string()
    .default('{source}.spec.ts')
    .describe('Pattern for spec file path; {source} expands to source path without extension'),
  parallelism: z.number().int().min(1).max(16).default(2),
  dryRun: z.boolean().default(false),
  resume: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  cacheDir: z.string().default('.cache/fix-coverage'),
  reportDir: z.string().default('reports/fix-coverage'),
  globalTimeoutMs: z.number().int().positive().default(30 * 60 * 1000),
  claude: z.object({
    apiKey: z.string().min(1).optional(),
    model: z.string().default('claude-opus-4-7'),
    maxTokens: z.number().int().positive().max(64_000).default(16_000),
    temperature: z.number().min(0).max(1).default(0.2),
    requestTimeoutMs: z.number().int().positive().default(180_000),
    maxRetries: z.number().int().min(0).max(10).default(5),
    backoffBaseMs: z.number().int().positive().default(1_000),
    backoffMaxMs: z.number().int().positive().default(60_000),
    sourceTokenBudget: z
      .number()
      .int()
      .positive()
      .default(60_000)
      .describe('Approximate token budget when truncating source files'),
  }),
  gates: z.object({
    typescript: GateConfigSchema.default({}),
    eslint: GateConfigSchema.extend({
      maxWarnings: z.number().int().min(0).default(0),
    }).default({}),
    coverage: GateConfigSchema.extend({
      statementsThreshold: z.number().min(0).max(100).default(90),
      branchesThreshold: z.number().min(0).max(100).default(90),
      functionsThreshold: z.number().min(0).max(100).default(90),
      linesThreshold: z.number().min(0).max(100).default(90),
    }).default({}),
    flakiness: GateConfigSchema.extend({
      runs: z.number().int().min(1).max(10).default(3),
    }).default({}),
    mutation: GateConfigSchema.extend({
      threshold: z.number().min(0).max(100).default(80),
      optional: z.boolean().default(true),
    }).default({}),
    assertions: GateConfigSchema.extend({
      minPerTest: z.number().int().positive().default(2),
    }).default({}),
    mocks: GateConfigSchema.default({}),
    calls: GateConfigSchema.extend({
      requireOnlyWhenMocksPresent: z.boolean().default(true),
    }).default({}),
  }),
  reporters: z.object({
    markdown: z.boolean().default(true),
    json: z.boolean().default(true),
    junit: z.boolean().default(true),
    markdownPath: z.string().default('MODULI_NEXO.md'),
    markdownRotateLines: z.number().int().positive().default(2_000),
  }),
});

export type RunConfig = z.infer<typeof RunConfigSchema>;
export type GateConfig = z.infer<typeof GateConfigSchema>;

/**
 * Parse CLI/file input into a validated RunConfig. Any deviation from
 * the schema raises a structured ZodError with field paths, never silently
 * accepted.
 */
export function parseRunConfig(input: unknown): RunConfig {
  return RunConfigSchema.parse(input);
}
