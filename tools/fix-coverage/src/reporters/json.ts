import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { PipelineResult } from '../runner/pipeline';

export function writeJsonReport(reportDir: string, results: PipelineResult[]): string {
  const path = join(reportDir, `report-${Date.now()}.json`);
  mkdirSync(dirname(path), { recursive: true });
  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totals: {
      total: results.length,
      pass: results.filter((r) => r.status === 'pass').length,
      ceiling: results.filter((r) => r.status === 'ceiling').length,
      fail: results.filter((r) => r.status === 'fail').length,
    },
    results,
  };
  writeFileSync(path, JSON.stringify(summary, null, 2));
  return path;
}
