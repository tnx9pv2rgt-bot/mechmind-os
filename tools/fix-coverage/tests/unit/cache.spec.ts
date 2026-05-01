import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileCache } from '../../src/core/cache';

describe('FileCache', () => {
  let dir: string;
  let sourcePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fix-coverage-cache-'));
    sourcePath = join(dir, 'src.ts');
    writeFileSync(sourcePath, 'export const x = 1;\n');
  });

  it('returns null when no entry exists', () => {
    const c = new FileCache(dir);
    expect(c.get(sourcePath)).toBeNull();
  });

  it('persists and reloads entries keyed by source hash', async () => {
    const c1 = new FileCache(dir);
    await c1.set(sourcePath, { status: 'ceiling', reason: 'controller' });
    const c2 = new FileCache(dir);
    expect(c2.get(sourcePath)?.status).toBe('ceiling');
  });

  it('invalidates when source content changes', async () => {
    const c = new FileCache(dir);
    await c.set(sourcePath, { status: 'ceiling', reason: 'whatever' });
    writeFileSync(sourcePath, 'export const x = 2;\n');
    expect(c.get(sourcePath)).toBeNull();
  });

  it('hashFile produces stable digest for identical content', () => {
    const a = FileCache.hashFile(sourcePath);
    const b = FileCache.hashFile(sourcePath);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
