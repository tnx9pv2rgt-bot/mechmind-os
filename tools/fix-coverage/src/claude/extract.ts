/**
 * Robust code extraction from Claude responses.
 *
 * Strategy (in order):
 *   1. Look for the first ```typescript ... ``` fenced block; require it
 *      to be syntactically parseable as a TypeScript module.
 *   2. Fall back to the first ```ts``` or ``` (untagged) block, again
 *      validated by parser.
 *   3. If everything fails, return ExtractionError with details.
 *
 * We never accept text outside a fenced block, even if it looks like
 * code — that was the source of half the legacy failures.
 */

import { Project, ts } from 'ts-morph';

export class ExtractionError extends Error {}

export interface ExtractionResult {
  code: string;
  language: string;
  blockIndex: number;
}

const FENCE_RE = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;

export function extractCode(response: string): ExtractionResult {
  const blocks: Array<{ lang: string; code: string }> = [];
  for (const match of response.matchAll(FENCE_RE)) {
    blocks.push({ lang: match[1] ?? '', code: match[2] ?? '' });
  }
  if (blocks.length === 0) {
    throw new ExtractionError('No fenced code block found in response');
  }

  const ranked = blocks
    .map((b, i) => ({ ...b, index: i, score: rankBlock(b.lang) }))
    .sort((a, b) => b.score - a.score);

  for (const block of ranked) {
    if (block.score === 0) continue;
    if (isParseable(block.code)) {
      return { code: block.code.trim() + '\n', language: block.lang || 'ts', blockIndex: block.index };
    }
  }

  throw new ExtractionError(
    `Found ${blocks.length} code block(s) but none parsed as valid TypeScript`,
  );
}

function rankBlock(lang: string): number {
  const normalized = lang.toLowerCase();
  if (normalized === 'typescript' || normalized === 'ts') return 3;
  if (normalized === 'javascript' || normalized === 'js') return 2;
  if (normalized === '') return 1;
  return 0;
}

function isParseable(code: string): boolean {
  try {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        allowJs: true,
        noEmit: true,
      },
    });
    const sf = project.createSourceFile('candidate.ts', code, { overwrite: true });
    const syntactic = sf.getPreEmitDiagnostics().filter((d) => {
      const cat = d.getCategory();
      const code = d.getCode();
      // Accept type-resolution errors; reject only syntactic errors.
      return cat === ts.DiagnosticCategory.Error && code >= 1000 && code < 2000;
    });
    return syntactic.length === 0;
  } catch {
    return false;
  }
}
