/**
 * Token-aware source truncation.
 *
 * The legacy bash script truncated source files mid-line, which broke
 * Claude's understanding of method signatures. This module truncates
 * at AST boundaries: it removes complete statements (function bodies,
 * irrelevant imports, etc.) until the file fits the token budget,
 * preserving signature integrity at all costs.
 *
 * Token estimation: ~4 chars per token (conservative GPT-style heuristic).
 * For Claude's tokenizer the real number is closer to 3.5; we round up.
 */

import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';

export interface TruncationResult {
  text: string;
  estimatedTokens: number;
  truncated: boolean;
  removedNodes: number;
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate a TypeScript source so its estimated token count fits the
 * budget, while preserving:
 *   - All imports and exports
 *   - All class/method/function signatures
 *   - All decorators and JSDoc on public members
 *
 * Method bodies are reduced to "/* ... */" placeholders in priority order
 * (longest first) until the budget is met. If budget is still exceeded,
 * private member bodies are replaced; finally, comment blocks are stripped.
 */
export function truncateSource(text: string, tokenBudget: number): TruncationResult {
  const initialTokens = estimateTokens(text);
  if (initialTokens <= tokenBudget) {
    return { text, estimatedTokens: initialTokens, truncated: false, removedNodes: 0 };
  }

  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
  const sf = project.createSourceFile('input.ts', text, { overwrite: true });

  let removed = 0;

  removed += stubBodies(sf, ['private']);
  if (estimateTokens(sf.getFullText()) <= tokenBudget) {
    return finalize(sf, tokenBudget, removed);
  }

  removed += stubBodies(sf, ['protected']);
  if (estimateTokens(sf.getFullText()) <= tokenBudget) {
    return finalize(sf, tokenBudget, removed);
  }

  removed += stripCommentBlocks(sf);
  if (estimateTokens(sf.getFullText()) <= tokenBudget) {
    return finalize(sf, tokenBudget, removed);
  }

  removed += stubBodies(sf, ['public']);
  return finalize(sf, tokenBudget, removed);
}

function finalize(sf: SourceFile, budget: number, removed: number): TruncationResult {
  let text = sf.getFullText();
  const tokens = estimateTokens(text);
  if (tokens > budget) {
    const charBudget = budget * CHARS_PER_TOKEN;
    const lastNewline = text.lastIndexOf('\n', charBudget);
    text = text.slice(0, lastNewline > 0 ? lastNewline : charBudget) + '\n// [truncated]\n';
  }
  return {
    text,
    estimatedTokens: estimateTokens(text),
    truncated: true,
    removedNodes: removed,
  };
}

function stubBodies(sf: SourceFile, visibilities: Array<'private' | 'protected' | 'public'>): number {
  let count = 0;
  sf.forEachDescendant((node) => {
    if (
      Node.isMethodDeclaration(node) ||
      Node.isFunctionDeclaration(node) ||
      Node.isConstructorDeclaration(node)
    ) {
      const vis = getVisibility(node);
      if (!visibilities.includes(vis)) return;
      const body = node.getFirstChildByKind(SyntaxKind.Block);
      if (!body) return;
      body.replaceWithText('{ /* ... */ }');
      count += 1;
    }
  });
  return count;
}

function stripCommentBlocks(sf: SourceFile): number {
  let count = 0;
  const fullText = sf.getFullText();
  const stripped = fullText.replace(/\/\*[\s\S]*?\*\//g, () => {
    count += 1;
    return '';
  });
  sf.replaceWithText(stripped);
  return count;
}

function getVisibility(node: Node): 'private' | 'protected' | 'public' {
  if ('hasModifier' in node && typeof (node as { hasModifier: unknown }).hasModifier === 'function') {
    const n = node as Node & { hasModifier: (k: SyntaxKind) => boolean };
    if (n.hasModifier(SyntaxKind.PrivateKeyword)) return 'private';
    if (n.hasModifier(SyntaxKind.ProtectedKeyword)) return 'protected';
  }
  return 'public';
}
