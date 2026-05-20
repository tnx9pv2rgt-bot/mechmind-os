#!/usr/bin/env node
/**
 * Verifica completezza modulo NestJS.
 *
 * Analisi statica: 5 categorie di scoring (0-100).
 *
 * Uso:
 *   node scripts/verify-module.mjs <modulo>           # Human-readable
 *   node scripts/verify-module.mjs <modulo> --json    # JSON per generate-tests.mjs
 *
 * Exit codes:
 *   0 = score ≥ 70 (APPROVED)
 *   1 = score < 70 (NEEDS FIX)
 *   2 = module not found
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND_SRC = join(ROOT, 'backend', 'src');
const FRONTEND_APP = join(ROOT, 'frontend', 'app');
const PRISMA_SCHEMA = join(ROOT, 'backend', 'prisma', 'schema.prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractPrismaModels(schema, mod) {
  const keywords = mod.toLowerCase().replace(/-/g, '').split(/(?=[A-Z])/);
  const lines = schema.split('\n');
  const out = [];
  let capture = false;
  let braces = 0;

  for (const line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      const name = modelMatch[1].toLowerCase();
      capture = keywords.some(k => name.includes(k));
      braces = 0;
    }
    if (capture) {
      out.push(line);
      braces += (line.match(/\{/g) || []).length;
      braces -= (line.match(/\}/g) || []).length;
      if (braces <= 0 && line.includes('}')) capture = false;
    }
  }
  return out.join('\n');
}

function readSourceFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir).sort()) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      readSourceFiles(fullPath, files);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.module.ts') &&
      !entry.endsWith('index.ts')
    ) {
      files.push({
        path: entry,
        fullPath,
        content: readFileSync(fullPath, 'utf8'),
      });
    }
  }
  return files;
}

// ─── Scoring Categories ───────────────────────────────────────────────────

const SCORING = {
  STRUCTURE: 30,      // ogni service/controller senza spec → -7.5 pt
  DATABASE: 25,       // model +10, tenantId +10, unsafe queries -5 max
  STATE_MACHINE: 20,  // validateTransition +10, invalid transitions test +10
  MOCK_QUALITY: 15,   // TENANT_ID const +7, tenantId assertions +8
  FRONTEND: 10,       // page +5, API route +5
};

// ─── Checks ───────────────────────────────────────────────────────────────

function checkStructure(moduleDir, moduleName) {
  const sourceFiles = readSourceFiles(moduleDir);
  let points = SCORING.STRUCTURE;
  const gaps = [];

  // Conta service e controller senza spec
  const withoutSpec = sourceFiles.filter(f => {
    const specPath = f.fullPath.replace(/\.ts$/, '.spec.ts');
    return !existsSync(specPath);
  });

  const penalty = withoutSpec.length * 7.5;
  points = Math.max(0, points - penalty);

  if (withoutSpec.length > 0) {
    gaps.push(`${withoutSpec.length} file senza .spec.ts: ${withoutSpec.map(f => f.path).join(', ')}`);
  }

  return { points, gaps, found: sourceFiles.length, missing: withoutSpec.length };
}

function checkDatabase(moduleDir, moduleName) {
  let points = SCORING.DATABASE;
  const gaps = [];
  const schema = existsSync(PRISMA_SCHEMA) ? readFileSync(PRISMA_SCHEMA, 'utf8') : '';
  const prismaModels = extractPrismaModels(schema, moduleName);

  // Check model exists
  if (!prismaModels || prismaModels.trim().length === 0) {
    gaps.push('Model Prisma non trovato');
    return { points: 0, gaps, modelExists: false, hasTenantId: false };
  }

  const modelPoints = 10;
  points = modelPoints; // Start with model found

  // Check tenantId field
  const hasTenantId = /tenantId\s+String/i.test(prismaModels);
  if (hasTenantId) {
    points += 10;
  } else {
    gaps.push('Campo tenantId assente nel model Prisma');
  }

  // Check for unsafe queries (naive check)
  const sourceFiles = readSourceFiles(moduleDir);
  let unsafeQueries = 0;
  for (const file of sourceFiles) {
    const hasWhere = /\.findMany\(|\.findUnique\(|\.update\(|\.delete\(/.test(file.content);
    const safeWhere = /where:\s*\{\s*tenantId/.test(file.content);
    if (hasWhere && !safeWhere) {
      unsafeQueries++;
    }
  }

  if (unsafeQueries > 0) {
    const penalty = Math.min(5, unsafeQueries);
    points -= penalty;
    gaps.push(`${unsafeQueries} query possibilmente senza tenantId`);
  }

  return { points: Math.max(0, points), gaps, modelExists: true, hasTenantId };
}

function checkStateMachine(moduleDir, moduleName) {
  let points = SCORING.STATE_MACHINE;
  const gaps = [];
  const sourceFiles = readSourceFiles(moduleDir);

  // Look for validateTransition
  let hasValidateTransition = false;
  let hasTransitionTest = false;

  for (const file of sourceFiles) {
    if (file.content.includes('validateTransition')) {
      hasValidateTransition = true;
    }
    if (file.path.endsWith('.spec.ts') && file.content.includes('validateTransition')) {
      hasTransitionTest = true;
    }
  }

  // Check spec files for invalid transition tests
  const specFiles = sourceFiles.filter(f => f.path.endsWith('.spec.ts'));
  let testedInvalid = false;
  for (const spec of specFiles) {
    if (/should.*fail|should.*throw|should.*error.*transition|invalid.*transition/i.test(spec.content)) {
      testedInvalid = true;
    }
  }

  if (hasValidateTransition) points += 10;
  else gaps.push('validateTransition non trovato');

  if (testedInvalid) points += 10;
  else if (hasValidateTransition) {
    points -= 2;
    gaps.push('Transizioni invalide non testate');
  }

  return { points: Math.max(0, points), gaps, hasValidateTransition, testedInvalid };
}

function checkMockQuality(moduleDir, moduleName) {
  let points = SCORING.MOCK_QUALITY;
  const gaps = [];
  const sourceFiles = readSourceFiles(moduleDir);

  let hasTenantIdConst = false;
  let tenantIdAssertions = 0;
  let totalAssertions = 0;

  for (const file of sourceFiles) {
    if (file.path.endsWith('.spec.ts')) {
      if (/const\s+TENANT_ID\s*=/.test(file.content)) {
        hasTenantIdConst = true;
      }

      // Count expect/assert statements
      const expects = file.content.match(/expect\(/g) || [];
      totalAssertions += expects.length;

      // Count assertions that mention tenantId
      const tenantIdLines = file.content.split('\n').filter(l => l.includes('tenantId'));
      tenantIdAssertions += tenantIdLines.filter(l => /expect|assert|toBe|toEqual|toContain/.test(l)).length;
    }
  }

  if (hasTenantIdConst) points += 7;
  else gaps.push('TENANT_ID const non trovata in spec');

  const coverage = totalAssertions > 0 ? (tenantIdAssertions / totalAssertions) : 0;
  if (coverage >= 0.8) points += 8;
  else if (coverage > 0) {
    points += Math.floor(8 * coverage);
    gaps.push(`${Math.round((1 - coverage) * 100)}% assertion senza tenantId check`);
  } else if (totalAssertions > 0) {
    gaps.push('Assertion senza tenantId check');
  }

  return { points: Math.max(0, points), gaps, hasTenantIdConst, tenantIdCoverage: coverage };
}

function checkFrontend(moduleDir, moduleName) {
  let points = 0;
  const gaps = [];

  // Convert module name (booking -> bookings for typical plural convention)
  const routeNames = [moduleName, moduleName + 's', moduleName.replace(/s$/, '')];

  // Check frontend page
  let pageExists = false;
  for (const name of routeNames) {
    const pagePath = join(FRONTEND_APP, 'dashboard', name, 'page.tsx');
    if (existsSync(pagePath)) {
      pageExists = true;
      points += 5;
      break;
    }
  }
  if (!pageExists) {
    gaps.push('Frontend page non trovata');
  }

  // Check frontend API route
  let routeExists = false;
  for (const name of routeNames) {
    const routePath = join(FRONTEND_APP, 'api', name, 'route.ts');
    if (existsSync(routePath)) {
      routeExists = true;
      points += 5;
      break;
    }
  }
  if (!routeExists) {
    gaps.push('API route frontend non trovata');
  }

  return { points, gaps, pageExists, routeExists };
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const [, , moduleName, jsonFlag] = process.argv;
  const outputJson = jsonFlag === '--json';

  if (!moduleName) {
    console.error('Uso: node scripts/verify-module.mjs <modulo> [--json]');
    process.exit(1);
  }

  const moduleDir = join(BACKEND_SRC, moduleName);
  if (!existsSync(moduleDir)) {
    if (outputJson) {
      console.log(JSON.stringify({ error: 'Module not found', moduleName }));
    } else {
      console.error(`❌ Modulo non trovato: ${moduleName}`);
    }
    process.exit(2);
  }

  // Run all checks
  const structure = checkStructure(moduleDir, moduleName);
  const database = checkDatabase(moduleDir, moduleName);
  const stateMachine = checkStateMachine(moduleDir, moduleName);
  const mockQuality = checkMockQuality(moduleDir, moduleName);
  const frontend = checkFrontend(moduleDir, moduleName);

  const totalScore = structure.points + database.points + stateMachine.points + mockQuality.points + frontend.points;
  const maxScore = Object.values(SCORING).reduce((a, b) => a + b, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  // Collect all gaps
  const allGaps = [
    ...(structure.gaps.length > 0 ? [['STRUTTURA', structure.gaps]] : []),
    ...(database.gaps.length > 0 ? [['DATABASE', database.gaps]] : []),
    ...(stateMachine.gaps.length > 0 ? [['STATE MACHINE', stateMachine.gaps]] : []),
    ...(mockQuality.gaps.length > 0 ? [['MOCK QUALITY', mockQuality.gaps]] : []),
    ...(frontend.gaps.length > 0 ? [['FRONTEND', frontend.gaps]] : []),
  ];

  if (outputJson) {
    console.log(JSON.stringify({
      score: percentage,
      maxScore,
      approved: percentage >= 70,
      breakdown: {
        structure: structure.points,
        database: database.points,
        stateMachine: stateMachine.points,
        mockQuality: mockQuality.points,
        frontend: frontend.points,
      },
      gaps: Object.fromEntries(allGaps),
    }));
  } else {
    console.log(`\n═══ VERIFICA MODULO: ${moduleName.toUpperCase()} ═══ Score: ${percentage}/100\n`);
    console.log(`STRUTTURA       (${structure.points}/${SCORING.STRUCTURE})   ${structure.points === SCORING.STRUCTURE ? '✅' : '⚠️'} ${structure.found} file, ${structure.missing} senza spec`);
    console.log(`DATABASE        (${database.points}/${SCORING.DATABASE})   ${database.points === SCORING.DATABASE ? '✅' : '⚠️'} ${database.modelExists ? 'model found' : 'NO MODEL'}, tenantId: ${database.hasTenantId ? '✅' : '❌'}`);
    console.log(`STATE MACHINE   (${stateMachine.points}/${SCORING.STATE_MACHINE})   ${stateMachine.hasValidateTransition ? '✅' : '❌'} validateTransition, ${stateMachine.testedInvalid ? '✅' : '⚠️'} invalid tests`);
    console.log(`MOCK QUALITY    (${mockQuality.points}/${SCORING.MOCK_QUALITY})   ${mockQuality.hasTenantIdConst ? '✅' : '⚠️'} TENANT_ID, ${mockQuality.tenantIdCoverage >= 0.8 ? '✅' : '⚠️'} tenantId assertions`);
    console.log(`FRONTEND        (${frontend.points}/${SCORING.FRONTEND})   ${frontend.pageExists ? '✅' : '❌'} page, ${frontend.routeExists ? '✅' : '❌'} API route`);

    if (allGaps.length > 0) {
      console.log(`\nRISK RANKING:`);
      allGaps.forEach(([category, gaps], i) => {
        gaps.forEach((gap, j) => {
          console.log(`  [${i + 1}.${j + 1}] ${gap}`);
        });
      });
    }

    console.log(`\n→ SCORE ${percentage}/100 — ${percentage >= 70 ? '✅ Generazione APPROVATA' : '❌ Richiede fix prima di generare'}\n`);
  }

  process.exit(percentage >= 70 ? 0 : 1);
}

main();
