import { buildPrompt } from '../../src/claude/prompt';
import { truncateSource } from '../../src/ast/source-truncate';

describe('buildPrompt', () => {
  const truncated = truncateSource('export const x = 1;\n', 1_000);

  it('includes tenantId rule when convention enabled', () => {
    const p = buildPrompt({
      sourcePath: 'src/foo.service.ts',
      sourceModuleName: 'foo.service',
      truncated,
      framework: 'nestjs',
      conventions: { requireTenantId: true, minAssertionsPerTest: 2 },
    });
    expect(p.system).toMatch(/tenantId/);
    expect(p.user).toMatch(/tenantId/);
  });

  it('appends retry feedback when present', () => {
    const p = buildPrompt({
      sourcePath: 'src/foo.ts',
      sourceModuleName: 'foo',
      truncated,
      framework: 'nestjs',
      conventions: { requireTenantId: false, minAssertionsPerTest: 2 },
      retryFeedback: [{ gate: 'coverage', reason: 'branches 60% < 90%', excerpt: 'lines 12-30 uncovered' }],
    });
    expect(p.user).toMatch(/Previous attempt failed/);
    expect(p.user).toMatch(/coverage/);
    expect(p.user).toMatch(/lines 12-30/);
  });

  it('marks truncation in the user prompt when source was reduced', () => {
    const heavy = truncateSource('export const x = "' + 'a'.repeat(100_000) + '";\n', 100);
    const p = buildPrompt({
      sourcePath: 'src/foo.ts',
      sourceModuleName: 'foo',
      truncated: heavy,
      framework: 'nestjs',
      conventions: { requireTenantId: false, minAssertionsPerTest: 2 },
    });
    expect(p.user).toMatch(/truncated/);
  });
});
