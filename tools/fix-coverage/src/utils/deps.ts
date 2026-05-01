/**
 * Verify external dependencies before the orchestrator starts. Each
 * dependency is checked via `--version` (or equivalent) with a short
 * timeout. Missing dependencies cause the run to abort with an
 * actionable error message.
 */

import { execa } from 'execa';

export interface DependencyCheck {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  hint: string;
}

export const DEPENDENCIES: DependencyCheck[] = [
  {
    name: 'node',
    command: 'node',
    args: ['--version'],
    required: true,
    hint: 'Install Node.js >= 20 from https://nodejs.org',
  },
  {
    name: 'npx',
    command: 'npx',
    args: ['--version'],
    required: true,
    hint: 'npx ships with Node.js — verify your Node install',
  },
  {
    name: 'tsc',
    command: 'npx',
    args: ['tsc', '--version'],
    required: true,
    hint: 'Run `npm install -D typescript` in the target project',
  },
  {
    name: 'jest',
    command: 'npx',
    args: ['jest', '--version'],
    required: true,
    hint: 'Run `npm install -D jest ts-jest` in the target project',
  },
  {
    name: 'eslint',
    command: 'npx',
    args: ['eslint', '--version'],
    required: false,
    hint: 'Optional: Run `npm install -D eslint` to enable the lint gate',
  },
  {
    name: 'stryker',
    command: 'npx',
    args: ['stryker', '--version'],
    required: false,
    hint: 'Optional: install @stryker-mutator/core to enable mutation gate',
  },
];

export interface DependencyResult {
  name: string;
  available: boolean;
  version?: string;
  hint?: string;
}

export async function checkDependencies(
  list: DependencyCheck[] = DEPENDENCIES,
  timeoutMs = 10_000,
): Promise<DependencyResult[]> {
  const results = await Promise.all(
    list.map(async (dep) => {
      try {
        const { stdout } = await execa(dep.command, dep.args, {
          timeout: timeoutMs,
          reject: false,
        });
        return { name: dep.name, available: true, version: stdout.trim().split('\n')[0] };
      } catch {
        return { name: dep.name, available: false, hint: dep.hint };
      }
    }),
  );
  return results;
}

export class MissingDependencyError extends Error {
  constructor(missing: DependencyResult[]) {
    const lines = missing.map((m) => `  - ${m.name}: ${m.hint}`).join('\n');
    super(`Required dependencies missing:\n${lines}`);
  }
}

export function assertRequiredDependencies(
  results: DependencyResult[],
  list: DependencyCheck[] = DEPENDENCIES,
): void {
  const requiredNames = new Set(list.filter((d) => d.required).map((d) => d.name));
  const missing = results.filter((r) => requiredNames.has(r.name) && !r.available);
  if (missing.length > 0) throw new MissingDependencyError(missing);
}
