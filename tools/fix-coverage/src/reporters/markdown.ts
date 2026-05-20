/**
 * Markdown reporter — appends to MODULI_NEXO.md (or any path) with
 * automatic rotation: when the file exceeds the configured line count,
 * the oldest log section is moved to a dated archive file alongside.
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { dirname, join, basename } from 'path';
import { mkdirSync } from 'fs';
import lockfile from 'proper-lockfile';
import { PipelineResult } from '../runner/pipeline';

const MARKER = '<!-- fix-coverage:log -->';

export interface MarkdownReporterOptions {
  filePath: string;
  rotateLines: number;
}

export async function appendMarkdown(opts: MarkdownReporterOptions, results: PipelineResult[]): Promise<void> {
  mkdirSync(dirname(opts.filePath), { recursive: true });
  if (!existsSync(opts.filePath)) writeFileSync(opts.filePath, initialContent());

  const release = await lockfile.lock(opts.filePath, { retries: { retries: 5, minTimeout: 50 } });
  try {
    let body = readFileSync(opts.filePath, 'utf8');
    const lineCount = body.split('\n').length;
    if (lineCount > opts.rotateLines) {
      rotate(opts.filePath, body);
      body = initialContent();
    }
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const rows = results.map((r) => {
      const cov = r.gateResults.find((g) => g.gate === 'coverage');
      const stmts = cov?.metrics?.statements ?? '–';
      const branches = cov?.metrics?.branches ?? '–';
      const status = r.status === 'pass' ? '✅' : r.status === 'ceiling' ? '🏛️' : '❌';
      return `| ${ts} | backend | ${escape(r.sourcePath)} | fix-coverage | ${stmts}% / ${branches}% | ${status} |`;
    });
    writeFileSync(opts.filePath, body + rows.join('\n') + '\n');
  } finally {
    await release();
  }
}

function rotate(path: string, body: string): void {
  const archiveName = `${basename(path, '.md')}.${new Date().toISOString().slice(0, 10)}.md`;
  const archivePath = join(dirname(path), archiveName);
  renameSync(path, archivePath);
  writeFileSync(path, body.split(MARKER)[0] ?? initialContent());
}

function initialContent(): string {
  return `# Coverage Log\n\n${MARKER}\n\n| Timestamp | Side | Source | Tool | Statements / Branches | Status |\n| --- | --- | --- | --- | --- | --- |\n`;
}

function escape(s: string): string {
  return s.replace(/\|/g, '\\|');
}
