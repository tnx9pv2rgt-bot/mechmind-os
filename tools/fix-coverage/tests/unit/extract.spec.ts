import { extractCode, ExtractionError } from '../../src/claude/extract';

describe('extractCode', () => {
  it('extracts a single typescript fenced block', () => {
    const r = extractCode('preface\n```typescript\nexport const x: number = 1;\n```\nepilogue');
    expect(r.language).toBe('typescript');
    expect(r.code).toContain('export const x');
    expect(r.blockIndex).toBe(0);
  });

  it('prefers typescript over untagged blocks', () => {
    const r = extractCode('```\nfoo\n```\n```typescript\nconst y: string = "ok";\n```');
    expect(r.language).toBe('typescript');
    expect(r.code).toContain('y: string');
  });

  it('falls back to untagged block when ts is malformed', () => {
    const r = extractCode('```typescript\nexport class { invalid syntax\n```\n```\nconst z: number = 2;\n```');
    expect(r.code).toContain('z: number');
  });

  it('throws ExtractionError when no fenced block exists', () => {
    expect(() => extractCode('plain prose with no fences')).toThrow(ExtractionError);
  });

  it('throws ExtractionError when all blocks are syntactically broken', () => {
    expect(() => extractCode('```typescript\nclass {{{\n```')).toThrow(ExtractionError);
  });

  it('rejects non-typescript languages with score 0', () => {
    expect(() => extractCode('```python\nprint("hi")\n```')).toThrow(ExtractionError);
  });
});
