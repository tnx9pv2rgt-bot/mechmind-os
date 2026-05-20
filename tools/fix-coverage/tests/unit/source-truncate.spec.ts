import { truncateSource, estimateTokens } from '../../src/ast/source-truncate';

describe('truncateSource', () => {
  it('returns input unchanged when within budget', () => {
    const code = 'export const x = 1;\n';
    const r = truncateSource(code, 1_000);
    expect(r.truncated).toBe(false);
    expect(r.text).toBe(code);
    expect(r.removedNodes).toBe(0);
  });

  it('preserves public method signatures while stubbing private bodies', () => {
    const code = `
export class Service {
  public doIt(x: number): number {
    const big = ${'"x".repeat(10_000) + '}'};
    return x + 1;
  }
  private heavy(): void {
    const stuff = ${'"x".repeat(20_000) + '}'};
    void stuff;
  }
}
`;
    const r = truncateSource(code, Math.floor(estimateTokens(code) * 0.6));
    expect(r.truncated).toBe(true);
    expect(r.text).toContain('public doIt(x: number): number');
    expect(r.text.includes('heavy')).toBe(true);
  });

  it('caps text length when AST stubbing alone is insufficient', () => {
    const huge = 'export const a = "' + 'x'.repeat(200_000) + '";\n';
    const r = truncateSource(huge, 1_000);
    expect(r.truncated).toBe(true);
    expect(estimateTokens(r.text)).toBeLessThanOrEqual(1_000 + 50);
  });
});

describe('estimateTokens', () => {
  it('rounds up to whole tokens', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});
