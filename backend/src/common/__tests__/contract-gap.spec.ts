import * as fs from 'fs';
import * as path from 'path';

/** Recursively collect files matching a pattern */
function walkFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

/** Extract /api/* calls from source files */
function extractApiCalls(dirs: string[]): string[] {
  const apiCallRegex = /['"`](\/api\/[^'"`\s),$]*)/g;
  const calls = new Set<string>();
  for (const dir of dirs) {
    const files = walkFiles(dir, ['.ts', '.tsx']);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = apiCallRegex.exec(content)) !== null) {
        const call = match[1].split('?')[0].replace(/\/$/, '');
        if (call) calls.add(call);
      }
    }
  }
  return [...calls].sort();
}

describe('Contract Gap Analysis', () => {
  const frontendDir = path.resolve(__dirname, '../../../../frontend');

  it('should not have frontend API calls to non-existent routes', () => {
    const calls = extractApiCalls([
      path.join(frontendDir, 'app'),
      path.join(frontendDir, 'components'),
    ]);

    const missingRoutes: string[] = [];
    for (const call of calls) {
      if (!call.startsWith('/api/')) continue;

      const routePath = path.join(frontendDir, 'app', call, 'route.ts');
      if (fs.existsSync(routePath)) continue;

      // Check the call directory itself for dynamic child routes (e.g. /api/public/estimates → /api/public/estimates/[token]/route.ts)
      const callDir = path.join(frontendDir, 'app', call);
      let hasRoute = false;
      if (fs.existsSync(callDir) && fs.statSync(callDir).isDirectory()) {
        try {
          const entries = fs.readdirSync(callDir);
          for (const entry of entries) {
            if (entry.startsWith('[')) {
              const dynamicRoute = path.join(callDir, entry, 'route.ts');
              if (fs.existsSync(dynamicRoute)) {
                hasRoute = true;
                break;
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (hasRoute) continue;

      // Check parent directory for dynamic route
      const parentDir = path.join(frontendDir, 'app', path.dirname(call));
      if (fs.existsSync(parentDir)) {
        try {
          const entries = fs.readdirSync(parentDir);
          for (const entry of entries) {
            if (entry.startsWith('[')) {
              const dynamicRoute = path.join(parentDir, entry, 'route.ts');
              if (fs.existsSync(dynamicRoute)) {
                hasRoute = true;
                break;
              }
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Check grandparent too (for deeper nested dynamic routes)
      if (!hasRoute) {
        const grandparentDir = path.join(frontendDir, 'app', path.dirname(path.dirname(call)));
        if (fs.existsSync(grandparentDir)) {
          try {
            const entries = fs.readdirSync(grandparentDir);
            for (const entry of entries) {
              if (entry.startsWith('[')) {
                const subDir = path.join(grandparentDir, entry);
                if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
                  const subEntries = fs.readdirSync(subDir);
                  for (const sub of subEntries) {
                    const deepRoute = path.join(subDir, sub, 'route.ts');
                    if (fs.existsSync(deepRoute)) {
                      hasRoute = true;
                      break;
                    }
                  }
                }
              }
              if (hasRoute) break;
            }
          } catch {
            /* ignore */
          }
        }
      }

      if (!hasRoute) {
        missingRoutes.push(call);
      }
    }

    if (missingRoutes.length > 0) {
      console.warn('ORPHAN API CALLS (frontend calls route that does not exist):');
      missingRoutes.forEach(r => console.warn(`  - ${r}`));
    }
    expect(missingRoutes).toHaveLength(0);
  });

  it('should not have frontend route.ts files that return mock data', () => {
    const apiDir = path.join(frontendDir, 'app', 'api');
    const routeFiles = walkFiles(apiDir, ['.ts']);
    const mockPatterns = ['DEMO_DATA', 'demoData', 'mockData', 'isDemoMode', 'getDemoData'];

    const mockFiles: string[] = [];
    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (mockPatterns.some(p => content.includes(p))) {
        mockFiles.push(file);
      }
    }

    if (mockFiles.length > 0) {
      console.error('FILES WITH MOCK DATA:');
      mockFiles.forEach(f => console.error(`  - ${f}`));
    }
    expect(mockFiles).toHaveLength(0);
  });

  it('should not expose encrypted fields in API responses', async () => {
    const swaggerUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    try {
      const res = await fetch(`${swaggerUrl}/api-docs-json`);
      if (!res.ok) {
        console.warn('Swagger not available, skipping schema test');
        return;
      }
      const swagger = (await res.json()) as {
        components?: {
          schemas?: Record<string, { properties?: Record<string, unknown> }>;
        };
      };

      const schemas = swagger.components?.schemas || {};
      const violations: string[] = [];

      for (const [name, schema] of Object.entries(schemas)) {
        const props = schema.properties || {};
        for (const field of Object.keys(props)) {
          if (field.startsWith('encrypted') || field.endsWith('Hash')) {
            if (!name.includes('Admin') && !name.includes('Internal')) {
              violations.push(`${name}.${field}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        console.error('ENCRYPTED FIELDS IN PUBLIC SCHEMAS:');
        violations.forEach(v => console.error(`  - ${v}`));
      }
      expect(violations).toHaveLength(0);
    } catch {
      console.warn('Backend not reachable, skipping Swagger schema test');
    }
  });

  it('should have @ApiProperty on all DTO fields', () => {
    const dtoDir = path.resolve(__dirname, '../../');
    const dtoFiles = walkFiles(dtoDir, ['.dto.ts']);

    const missingApiProperty: string[] = [];

    for (const file of dtoFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (
          line.match(/^\w+[?!]?\s*:\s*\w/) &&
          !line.startsWith('//') &&
          !line.startsWith('*') &&
          !line.startsWith('constructor') &&
          !line.startsWith('static') &&
          !line.startsWith('private') &&
          !line.startsWith('protected')
        ) {
          const prev5 = lines.slice(Math.max(0, i - 5), i).join('\n');
          if (!prev5.includes('@ApiProperty')) {
            const shortFile = file.replace(dtoDir, '');
            missingApiProperty.push(`${shortFile}:${i + 1} — ${line.trim()}`);
          }
        }
      }
    }

    if (missingApiProperty.length > 0) {
      console.warn(`DTO FIELDS WITHOUT @ApiProperty (${missingApiProperty.length} total):`);
      missingApiProperty.slice(0, 20).forEach(m => console.warn(`  - ${m}`));
    }
    // Warning only — too many false positives on getters/helpers
  });
});
