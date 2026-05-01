/**
 * Prompt engineering. The prompts are deterministic and built from a
 * structured input — no string concatenation chaos. This module is
 * pure (no side effects), making it trivial to unit-test.
 */

import { TruncationResult } from '../ast/source-truncate';

export interface PromptInput {
  sourcePath: string;
  sourceModuleName: string;
  truncated: TruncationResult;
  framework: 'nestjs' | 'generic';
  conventions: {
    requireTenantId: boolean;
    minAssertionsPerTest: number;
  };
  retryFeedback?: GateFeedback[];
}

export interface GateFeedback {
  gate: string;
  reason: string;
  excerpt?: string;
}

const SYSTEM_PROMPT = `You are a senior NestJS testing expert. You generate Jest test specs that satisfy the following non-negotiable rules:

1. TypeScript strict — no \`any\`, no \`@ts-ignore\`, explicit return types where required.
2. Every Prisma query MUST be verified to filter by tenantId.
3. Every \`it(...)\` block MUST contain at least 2 \`expect(...)\` calls.
4. Every \`it(...)\` block that uses mocks MUST include at least one \`toHaveBeenCalled*\` assertion.
5. Outside of \`beforeEach\`, mock state MUST use \`mockResolvedValueOnce\` / \`mockRejectedValueOnce\` / \`mockReturnValueOnce\` — never the persistent variants.
6. Cover happy path, NotFoundException, BadRequestException, and edge cases for every public method.

Return ONE single fenced TypeScript code block. Output nothing outside the fence.`;

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const sections: string[] = [];

  sections.push(`# Source file: ${input.sourcePath}`);
  sections.push(`Module name: ${input.sourceModuleName}`);
  sections.push(`Framework: ${input.framework}`);
  sections.push('');
  sections.push('## Conventions');
  if (input.conventions.requireTenantId) {
    sections.push('- Every Prisma query in tests must verify tenantId is included.');
  }
  sections.push(`- Minimum assertions per test: ${input.conventions.minAssertionsPerTest}`);
  sections.push('');

  if (input.retryFeedback && input.retryFeedback.length > 0) {
    sections.push('## Previous attempt failed the following gates — fix these specifically');
    for (const f of input.retryFeedback) {
      sections.push(`- **${f.gate}**: ${f.reason}`);
      if (f.excerpt) {
        sections.push('  ```\n  ' + f.excerpt.replace(/\n/g, '\n  ') + '\n  ```');
      }
    }
    sections.push('');
  }

  sections.push('## Source code');
  if (input.truncated.truncated) {
    sections.push(
      `> NOTE: Source was truncated to ~${input.truncated.estimatedTokens} tokens. ${input.truncated.removedNodes} bodies/blocks were stubbed. Signatures and decorators are preserved verbatim.`,
    );
  }
  sections.push('```typescript');
  sections.push(input.truncated.text.trimEnd());
  sections.push('```');
  sections.push('');
  sections.push(
    '## Output\nReturn exactly one fenced ```typescript code block containing the complete spec. No prose.',
  );

  return { system: SYSTEM_PROMPT, user: sections.join('\n') };
}
