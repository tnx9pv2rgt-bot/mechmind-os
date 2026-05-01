import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { safeResolve, safeResolveForWrite, deriveSpecPath, PathOutsideProjectError } from '../../src/utils/path';

describe('safeResolve', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fix-coverage-path-'));
    mkdirSync(join(root, 'sub'), { recursive: true });
    writeFileSync(join(root, 'sub/file.ts'), 'x');
  });

  it('resolves a path inside the project', () => {
    const r = safeResolve('sub/file.ts', root);
    expect(r.endsWith('sub/file.ts')).toBe(true);
  });

  it('rejects paths escaping the root', () => {
    expect(() => safeResolve('../../../etc/passwd', root)).toThrow(PathOutsideProjectError);
  });

  it('throws when path does not exist', () => {
    expect(() => safeResolve('missing.ts', root)).toThrow();
  });
});

describe('safeResolveForWrite', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fix-coverage-write-'));
    mkdirSync(join(root, 'sub'), { recursive: true });
  });

  it('accepts a not-yet-existing file with existing parent', () => {
    const p = safeResolveForWrite('sub/spec.ts', root);
    expect(p.endsWith('sub/spec.ts')).toBe(true);
  });

  it('rejects parent outside root', () => {
    expect(() => safeResolveForWrite('../escape.ts', root)).toThrow();
  });
});

describe('deriveSpecPath', () => {
  it('replaces {source} with path-without-extension', () => {
    expect(deriveSpecPath('src/a/b.service.ts', '{source}.spec.ts')).toBe('src/a/b.service.spec.ts');
  });
});
