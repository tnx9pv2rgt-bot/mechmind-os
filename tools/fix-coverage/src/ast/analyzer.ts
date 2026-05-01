/**
 * AST-based metrics extraction. The legacy bash version used grep,
 * which counts `expect(` inside string literals and comments — a
 * frequent source of false positives. We replace it with ts-morph
 * and walk the syntax tree.
 */

import { Project, SourceFile, SyntaxKind, CallExpression, Node } from 'ts-morph';

export interface SpecMetrics {
  testCount: number;
  assertionCount: number;
  callVerificationCount: number;
  persistentMockCount: number;
  testsWithMockUsage: number;
  testsWithCallVerification: number;
}

const ASSERTION_NAMES = new Set(['expect', 'assert']);
const CALL_VERIFY_PATTERN = /toHaveBeenCalled(With|Times)?$/;
const MOCK_PERSISTENT_NAMES = new Set([
  'mockResolvedValue',
  'mockRejectedValue',
  'mockReturnValue',
  'mockImplementation',
]);
const MOCK_USAGE_HINT = /^mock[A-Z]|\.mock\b|jest\.fn\b/;

export function loadSpec(text: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('spec.ts', text, { overwrite: true });
}

export function analyzeSpec(text: string): SpecMetrics {
  const sf = loadSpec(text);

  const testBlocks = collectTestBlocks(sf);
  let assertionCount = 0;
  let callVerificationCount = 0;
  let testsWithMockUsage = 0;
  let testsWithCallVerification = 0;

  for (const block of testBlocks) {
    let blockHasMock = false;
    let blockHasCallVerify = false;
    block.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      if (isAssertion(node)) assertionCount += 1;
      if (isCallVerification(node)) {
        callVerificationCount += 1;
        blockHasCallVerify = true;
      }
      if (looksLikeMockUsage(node)) blockHasMock = true;
    });
    if (blockHasMock) testsWithMockUsage += 1;
    if (blockHasCallVerify) testsWithCallVerification += 1;
  }

  const persistentMockCount = countPersistentMocks(sf);

  return {
    testCount: testBlocks.length,
    assertionCount,
    callVerificationCount,
    persistentMockCount,
    testsWithMockUsage,
    testsWithCallVerification,
  };
}

function collectTestBlocks(sf: SourceFile): Node[] {
  const blocks: Node[] = [];
  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const name = node.getExpression().getText();
    if (name === 'it' || name === 'test' || name === 'it.only' || name === 'test.only') {
      const fn = node.getArguments()[1];
      if (fn) blocks.push(fn);
    }
  });
  return blocks;
}

function isAssertion(call: CallExpression): boolean {
  const expr = call.getExpression();
  let current: Node | undefined = expr;
  while (current) {
    if (Node.isPropertyAccessExpression(current) || Node.isCallExpression(current)) {
      current = (current as Node & { getExpression: () => Node }).getExpression();
      continue;
    }
    if (Node.isIdentifier(current)) {
      return ASSERTION_NAMES.has(current.getText());
    }
    break;
  }
  return false;
}

function isCallVerification(call: CallExpression): boolean {
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  const name = expr.getName();
  return CALL_VERIFY_PATTERN.test(name);
}

function looksLikeMockUsage(call: CallExpression): boolean {
  const text = call.getExpression().getText();
  return MOCK_USAGE_HINT.test(text);
}

function countPersistentMocks(sf: SourceFile): number {
  let count = 0;
  const beforeEachRanges = collectBeforeEachRanges(sf);
  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) return;
    const name = expr.getName();
    if (!MOCK_PERSISTENT_NAMES.has(name)) return;
    const start = node.getStart();
    const inBeforeEach = beforeEachRanges.some(([s, e]) => start >= s && start <= e);
    if (!inBeforeEach) count += 1;
  });
  return count;
}

function collectBeforeEachRanges(sf: SourceFile): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    if (node.getExpression().getText() !== 'beforeEach') return;
    ranges.push([node.getStart(), node.getEnd()]);
  });
  return ranges;
}
