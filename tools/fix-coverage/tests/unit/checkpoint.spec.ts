import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CheckpointStore } from '../../src/core/checkpoint';

describe('CheckpointStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fix-coverage-cp-'));
  });

  it('records and retrieves a checkpoint', async () => {
    const cp = new CheckpointStore(dir);
    await cp.record('/a/b.ts', 'generated');
    expect(cp.get('/a/b.ts')?.lastStep).toBe('generated');
  });

  it('persists checkpoints across instances', async () => {
    const a = new CheckpointStore(dir);
    await a.record('/x.ts', 'coverage', 'low');
    const b = new CheckpointStore(dir);
    expect(b.get('/x.ts')?.errors).toContain('low');
  });

  it('reports pending files (not done/ceiling)', async () => {
    const cp = new CheckpointStore(dir);
    await cp.record('/done.ts', 'done');
    await cp.record('/ceil.ts', 'ceiling');
    await cp.record('/wip.ts', 'coverage');
    const pending = cp.pendingFiles(['/done.ts', '/ceil.ts', '/wip.ts', '/new.ts']);
    expect(pending.sort()).toEqual(['/new.ts', '/wip.ts']);
  });

  it('clear() removes a checkpoint', async () => {
    const cp = new CheckpointStore(dir);
    await cp.record('/x.ts', 'generated');
    await cp.clear('/x.ts');
    expect(cp.get('/x.ts')).toBeNull();
  });
});
