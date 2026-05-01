/**
 * Safe path operations. All file system access in the tool routes through
 * this module to enforce: symlink resolution, project-root containment,
 * and predictable handling of paths with spaces or unicode.
 */

import { realpathSync, existsSync, statSync } from 'fs';
import { resolve, relative, isAbsolute, sep } from 'path';

export class PathOutsideProjectError extends Error {
  constructor(p: string, root: string) {
    super(`Path escapes project root: ${p} (root: ${root})`);
  }
}

export class PathDoesNotExistError extends Error {
  constructor(p: string) {
    super(`Path does not exist: ${p}`);
  }
}

/**
 * Resolve a path to an absolute, symlink-free canonical form, and verify
 * it stays within `projectRoot`. Returns the resolved path.
 */
export function safeResolve(p: string, projectRoot: string): string {
  const root = realpathSync(resolve(projectRoot));
  const abs = isAbsolute(p) ? p : resolve(root, p);
  if (!existsSync(abs)) throw new PathDoesNotExistError(abs);
  const real = realpathSync(abs);
  const rel = relative(root, real);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new PathOutsideProjectError(real, root);
  }
  return real;
}

/**
 * Resolve a path that may not yet exist (e.g. a spec file we are about
 * to write). Verifies the *parent* directory is within projectRoot.
 */
export function safeResolveForWrite(p: string, projectRoot: string): string {
  const root = realpathSync(resolve(projectRoot));
  const abs = isAbsolute(p) ? p : resolve(root, p);
  const parent = abs.slice(0, abs.lastIndexOf(sep));
  if (!existsSync(parent)) throw new PathDoesNotExistError(parent);
  const realParent = realpathSync(parent);
  const rel = relative(root, realParent);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new PathOutsideProjectError(realParent, root);
  }
  return abs;
}

export function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Compute the spec path for a source file according to a pattern.
 * Pattern uses `{source}` as placeholder for the path-without-extension.
 */
export function deriveSpecPath(sourcePath: string, pattern: string): string {
  const noExt = sourcePath.replace(/\.[^./]+$/, '');
  return pattern.replace(/\{source\}/g, noExt);
}
