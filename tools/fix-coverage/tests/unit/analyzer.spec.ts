import { analyzeSpec } from '../../src/ast/analyzer';

const SPEC = `
import { jest } from '@jest/globals';
const mockSvc = { do: jest.fn() };
describe('block', () => {
  beforeEach(() => {
    mockSvc.do.mockResolvedValue('ok'); // allowed in beforeEach
  });
  it('happy', async () => {
    mockSvc.do.mockResolvedValueOnce('hi');
    const r = await mockSvc.do();
    expect(r).toBe('hi');
    expect(mockSvc.do).toHaveBeenCalled();
  });
  it('persistent BAD', async () => {
    mockSvc.do.mockResolvedValue('bad');
    const r = await mockSvc.do();
    expect(r).toBeDefined();
  });
  it('pure return', () => {
    expect(2 + 2).toBe(4);
    expect(true).toBe(true);
  });
});
`;

describe('analyzeSpec', () => {
  it('counts test blocks', () => {
    expect(analyzeSpec(SPEC).testCount).toBe(3);
  });

  it('counts assertions ignoring comments and strings', () => {
    const noisy = `
describe('x', () => {
  it('a', () => {
    const s = 'expect(this).toBe(that)'; // not a real call
    // expect(this).toBe(this) — comment
    expect(1).toBe(1);
    expect(2).toBe(2);
  });
});`;
    expect(analyzeSpec(noisy).assertionCount).toBe(2);
  });

  it('detects persistent mocks outside beforeEach', () => {
    const m = analyzeSpec(SPEC);
    expect(m.persistentMockCount).toBe(1);
  });

  it('counts call-verifications by test', () => {
    const m = analyzeSpec(SPEC);
    expect(m.testsWithCallVerification).toBe(1);
  });

  it('detects mock usage per test', () => {
    const m = analyzeSpec(SPEC);
    expect(m.testsWithMockUsage).toBeGreaterThanOrEqual(2);
    expect(m.testsWithMockUsage).toBeLessThanOrEqual(3);
  });
});
