/**
 * Discover candidate source files using fast-glob, with deterministic
 * ordering and dedupe. Excludes already-covered patterns: spec files,
 * type declaration files, dto/ directories, processors/.
 */

import fg from 'fast-glob';
import { realpathSync, statSync } from 'fs';

const DEFAULT_IGNORE = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.d.ts',
  '**/dto/**',
  '**/processors/**',
  '**/__tests__/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
];

export interface DiscoveryOptions {
  cwd: string;
  globs: string[];
  ignore?: string[];
  maxBytes?: number;
}

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  bytes: number;
}

export async function discoverFiles(opts: DiscoveryOptions): Promise<DiscoveredFile[]> {
  const ignore = [...DEFAULT_IGNORE, ...(opts.ignore ?? [])];
  const matches = await fg(opts.globs, {
    cwd: opts.cwd,
    ignore,
    onlyFiles: true,
    absolute: true,
    unique: true,
    followSymbolicLinks: false,
  });

  const seen = new Set<string>();
  const result: DiscoveredFile[] = [];
  for (const m of matches) {
    let real: string;
    try {
      real = realpathSync(m);
    } catch {
      continue;
    }
    if (seen.has(real)) continue;
    seen.add(real);

    const stat = statSync(real);
    if (!stat.isFile()) continue;
    if (opts.maxBytes && stat.size > opts.maxBytes) continue;
    if (looksBinary(real)) continue;

    result.push({
      absolutePath: real,
      relativePath: real.startsWith(opts.cwd) ? real.slice(opts.cwd.length + 1) : real,
      bytes: stat.size,
    });
  }
  return result.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
}

function looksBinary(path: string): boolean {
  // Reject obvious binary extensions; the AST parser will catch the rest.
  return /\.(png|jpg|jpeg|gif|pdf|zip|tar|gz|so|dylib|exe|wasm)$/i.test(path);
}
