import { parseRunConfig } from '../../src/config/schema';

describe('parseRunConfig', () => {
  it('rejects missing projectRoot', () => {
    expect(() => parseRunConfig({ sourceGlobs: ['src/**'] })).toThrow();
  });

  it('rejects empty source globs', () => {
    expect(() => parseRunConfig({ projectRoot: '/tmp', sourceGlobs: [] })).toThrow();
  });

  it('applies defaults for unspecified fields', () => {
    const cfg = parseRunConfig({
      projectRoot: '/tmp',
      sourceGlobs: ['src/**/*.ts'],
      claude: {},
    });
    expect(cfg.parallelism).toBe(2);
    expect(cfg.maxAttempts).toBe(3);
    expect(cfg.gates.coverage.statementsThreshold).toBe(90);
    expect(cfg.gates.coverage.branchesThreshold).toBe(90);
    expect(cfg.gates.assertions.minPerTest).toBe(2);
    expect(cfg.gates.mutation.optional).toBe(true);
  });

  it('rejects parallelism out of range', () => {
    expect(() =>
      parseRunConfig({ projectRoot: '/tmp', sourceGlobs: ['x'], parallelism: 0, claude: {} }),
    ).toThrow();
    expect(() =>
      parseRunConfig({ projectRoot: '/tmp', sourceGlobs: ['x'], parallelism: 99, claude: {} }),
    ).toThrow();
  });
});
