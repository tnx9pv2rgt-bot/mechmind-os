/**
 * JUnit XML reporter for CI/CD integration. Each source file becomes a
 * `<testcase>` and each gate becomes a child `<testcase>`. This format
 * is consumed natively by GitHub Actions, Jenkins, GitLab, CircleCI.
 */

import { create } from 'xmlbuilder2';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { PipelineResult } from '../runner/pipeline';

export function writeJunitReport(reportDir: string, results: PipelineResult[]): string {
  const path = join(reportDir, `junit-${Date.now()}.xml`);
  mkdirSync(dirname(path), { recursive: true });

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('testsuites', {
    name: 'fix-coverage',
    tests: results.length,
    failures: results.filter((r) => r.status === 'fail').length,
    skipped: results.filter((r) => r.status === 'ceiling').length,
    time: (results.reduce((s, r) => s + r.durationMs, 0) / 1000).toFixed(3),
  });

  for (const r of results) {
    const suite = root.ele('testsuite', {
      name: r.sourcePath,
      tests: r.gateResults.length,
      failures: r.gateResults.filter((g) => g.status === 'fail').length,
      skipped: r.gateResults.filter((g) => g.status === 'skipped' || g.status === 'not-applicable').length,
      time: (r.durationMs / 1000).toFixed(3),
    });
    for (const g of r.gateResults) {
      const tc = suite.ele('testcase', { name: g.gate, time: (g.durationMs / 1000).toFixed(3) });
      if (g.status === 'fail') tc.ele('failure', { message: g.message }).txt(g.feedback ?? '');
      else if (g.status === 'skipped' || g.status === 'not-applicable') tc.ele('skipped', { message: g.message });
    }
  }

  writeFileSync(path, root.end({ prettyPrint: true }));
  return path;
}
