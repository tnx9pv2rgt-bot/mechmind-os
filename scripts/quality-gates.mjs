/**
 * Quality Gates Infinitamente Critiche per Test Generation
 *
 * Regole non negoziabili:
 * 1. Security: SQL injection, tenantId bypass, secrets in code
 * 2. Architecture: pattern compliance, naming conventions
 * 3. TypeScript: strict mode, no any, explicit types
 * 4. Code Quality: linting, complexity, maintainability
 */

import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { spawnSync } from 'child_process';

export const QUALITY_GATES = {
  SECURITY: {
    SQL_INJECTION: {
      pattern: /execute|query\s*\(\s*["`].*\$|raw\s*sql|executeRawUnsafe/i,
      message: 'SQL injection risk: no raw SQL, use Prisma only',
      severity: 'CRITICAL',
    },
    TENANT_ID_BYPASS: {
      pattern: /\.findMany\s*\(|\.findUnique\s*\(|\.findFirst\s*\(|\.update\s*\(|\.delete\s*\(/,
      checkFn: (content, matches) => {
        // Verifica che ogni query abbia where: { tenantId
        const queriesWithoutWhere = matches.filter(m => !content.includes('where:'));
        return queriesWithoutWhere.length === 0;
      },
      message: 'Multi-tenancy violation: all queries MUST have where: { tenantId }',
      severity: 'CRITICAL',
    },
    HARDCODED_SECRETS: {
      pattern: /(password|api_key|secret|token)\s*[:=]\s*["`][\w\-]+["`]/i,
      message: 'Hardcoded secret detected',
      severity: 'CRITICAL',
    },
    CONSOLE_LOG: {
      pattern: /console\.(log|debug|info|warn)\s*\(/,
      message: 'console.log detected (use Logger service)',
      severity: 'HIGH',
    },
  },

  ARCHITECTURE: {
    SERVICE_PATTERN: {
      checkFn: (modulePath, servicePath) => {
        const hasService = existsSync(servicePath);
        const hasController = existsSync(servicePath.replace(/\.service\.ts$/, '.controller.ts'));
        const hasDtoDir = existsSync(join(modulePath, 'dto'));
        return hasService && (hasController || hasDtoDir);
      },
      message: 'Missing service/controller/DTO structure',
      severity: 'HIGH',
    },
    NAMING_CONVENTION: {
      pattern: /class\s+(\w+)/,
      checkFn: (match) => {
        const className = match[1];
        return /^[A-Z][a-zA-Z]*Service$|^[A-Z][a-zA-Z]*Controller$/.test(className);
      },
      message: 'Class naming must be PascalCase with Service/Controller suffix',
      severity: 'MEDIUM',
    },
  },

  TYPESCRIPT: {
    STRICT_MODE: {
      pattern: /:\s*any\b/,
      message: 'TypeScript any detected (use explicit types)',
      severity: 'HIGH',
    },
    EXPLICIT_RETURN_TYPES: {
      pattern: /(?:async\s+)?\(.*?\)\s*=>|function\s+\w+\s*\(/,
      checkFn: (match, content) => {
        // Semplifice check: se ha => o function, dovrebbe avere : TipoReturn
        return /:/.test(match[0]) || content.includes(': ');
      },
      message: 'Missing explicit return types',
      severity: 'MEDIUM',
    },
  },

  TESTING: {
    TENANT_ID_ASSERTION: {
      pattern: /const\s+TENANT_ID\s*=/,
      message: 'TENANT_ID constant MUST be defined in spec',
      severity: 'CRITICAL',
    },
    TENANTID_IN_EXPECT: {
      pattern: /expect\(.*\)\.toBe|expect\(.*\)\.toEqual/,
      checkFn: (match, content) => {
        // Almeno il 70% delle assertion dovrebbe mentionare tenantId
        const totalExpects = (content.match(/expect\(/g) || []).length;
        const tenantIdExpects = (content.match(/tenantId/g) || []).length;
        return tenantIdExpects / totalExpects >= 0.7;
      },
      message: '≥70% di assertions deve controllare tenantId',
      severity: 'HIGH',
    },
    EDGE_CASES: {
      pattern: /it\s*\(\s*['`"]/,
      checkFn: (match, content) => {
        const testNames = content.match(/it\s*\(\s*['`"]([^'"]+)['"]/g) || [];
        const hasErrorCases = testNames.some(t =>
          /error|fail|throw|exception|invalid|bad/i.test(t)
        );
        const hasEdgeCases = testNames.some(t =>
          /edge|boundary|null|empty|duplicate|concurrent|race/i.test(t)
        );
        return hasErrorCases && hasEdgeCases;
      },
      message: 'Must test error cases AND edge cases',
      severity: 'HIGH',
    },
  },
};

/**
 * Esegui linting con ESLint
 */
export function checkESLint(filePath, projectRoot) {
  const result = spawnSync('npx', ['eslint', filePath, '--no-eslintrc', '--config', join(projectRoot, '.eslintrc.json')], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    return {
      passed: false,
      errors: result.stdout || result.stderr,
    };
  }
  return { passed: true };
}

/**
 * Esegui TypeScript strict check
 */
export function checkTypeScript(projectRoot) {
  const result = spawnSync('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
    cwd: join(projectRoot, 'backend'),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    return {
      passed: false,
      errors: result.stdout || result.stderr,
    };
  }
  return { passed: true };
}

/**
 * Scannerizza per SonarQube rules (basico, senza SonarQube)
 */
export function checkCodeQuality(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const failures = [];

  // Cognitive complexity (troppi livelli di nesting)
  const nestingLevels = Math.max(...content.split('\n').map(line => {
    let depth = 0;
    for (const char of line) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    return depth;
  }));

  if (nestingLevels > 5) {
    failures.push(`Cognitive complexity too high (nesting: ${nestingLevels}, max: 5)`);
  }

  // Line length
  const longLines = content.split('\n').filter(l => l.length > 120);
  if (longLines.length > 3) {
    failures.push(`Too many long lines (>120 chars): ${longLines.length}`);
  }

  // Duplicate code
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 3; i++) {
    const chunk = lines.slice(i, i + 4).join('\n');
    const duplicates = content.split(chunk).length - 1;
    if (duplicates > 1) {
      failures.push(`Duplicate code block detected (lines ${i}-${i + 4})`);
      break;
    }
  }

  return {
    passed: failures.length === 0,
    issues: failures,
  };
}

/**
 * Valida un service spec file contro rules
 */
export function validateSpecFile(filePath, moduleDir) {
  const content = readFileSync(filePath, 'utf8');
  const failures = [];

  // SECURITY GATES
  Object.entries(QUALITY_GATES.SECURITY).forEach(([ruleName, rule]) => {
    const matches = content.match(rule.pattern) || [];

    if (rule.checkFn) {
      const passed = rule.checkFn(content, matches);
      if (!passed) {
        failures.push({
          gate: 'SECURITY',
          rule: ruleName,
          message: rule.message,
          severity: rule.severity,
        });
      }
    } else if (matches.length > 0) {
      failures.push({
        gate: 'SECURITY',
        rule: ruleName,
        message: rule.message,
        severity: rule.severity,
        matches: matches.slice(0, 2),
      });
    }
  });

  // TESTING GATES
  Object.entries(QUALITY_GATES.TESTING).forEach(([ruleName, rule]) => {
    if (rule.checkFn) {
      const matches = content.match(rule.pattern) || [];
      const passed = rule.checkFn(matches[0], content);
      if (!passed) {
        failures.push({
          gate: 'TESTING',
          rule: ruleName,
          message: rule.message,
          severity: rule.severity,
        });
      }
    } else {
      const matches = content.match(rule.pattern) || [];
      if (matches.length === 0) {
        failures.push({
          gate: 'TESTING',
          rule: ruleName,
          message: rule.message,
          severity: rule.severity,
        });
      }
    }
  });

  // CODE QUALITY
  const qualityCheck = checkCodeQuality(filePath);
  if (!qualityCheck.passed) {
    qualityCheck.issues.forEach(issue => {
      failures.push({
        gate: 'CODE_QUALITY',
        message: issue,
        severity: 'MEDIUM',
      });
    });
  }

  // Categorizza failures per severity
  const critical = failures.filter(f => f.severity === 'CRITICAL');
  const high = failures.filter(f => f.severity === 'HIGH');
  const medium = failures.filter(f => f.severity === 'MEDIUM');

  return {
    passed: critical.length === 0 && high.length === 0,
    critical,
    high,
    medium,
    total: failures.length,
  };
}

/**
 * Matrice di complessità moduli: assegna modello giusto per ogni modulo
 * TIER_1 (CRITICAL P0): Opus — mission-critical, security, state machine, PII
 * TIER_2 (HIGH P1): Sonnet — complex logic, multi-service, external deps
 * TIER_3 (MEDIUM P2): Sonnet — moderate complexity, clear business logic
 * TIER_4 (UTILITY): Haiku — no business logic, infrastructure/config
 */
const MODULE_COMPLEXITY_TIERS = {
  TIER_1_CRITICAL_OPUS: [
    'auth',           // 14 service, security critical
    'booking',        // state machine, concurrency, advisory lock
    'invoice',        // fatturapa, tax compliance, PDF
    'payment-link',   // Stripe, webhooks, PCI compliance
    'subscription',   // recurring billing, dunning, metering
    'gdpr',           // data export/deletion, RLS, GDPR EU
  ],
  TIER_2_HIGH_SONNET: [
    'notifications',  // 10 service, queue, real-time
    'admin',          // audit logs, role management
    'analytics',      // aggregation, time-series, Metabase
    'common',         // SPOF: PrismaService, EncryptionService (11 service)
    'dvi',            // DVI state machine, photo, AI
    'iot',            // sensor data, real-time telemetry
    'work-order',     // state machine, lineitem calc
    'customer',       // PII, multi-tenant, lifecycle
    'estimate',       // quote, conversion, margin
    'voice',          // Vapi integration, transcription
  ],
  TIER_3_MEDIUM_SONNET: [
    'rentri', 'parts', 'canned-job', 'accounting', 'portal',
    'membership', 'sms', 'reviews', 'location', 'predictive-maintenance',
    'ai-diagnostic', 'ai-scheduling', 'ai-compliance', 'benchmarking',
    'campaign', 'fleet', 'kiosk', 'labor-guide', 'obd', 'payroll',
    'peppol', 'production-board', 'public-token', 'security-incident',
    'tire', 'vehicle-history', 'webhook-subscription', 'declined-service',
    'inventory-alerts',
  ],
  TIER_4_UTILITY_HAIKU: [
    'config',         // env vars, static config
    'lib',            // shared utilities
    'middleware',     // express middleware
    'test',           // test utilities
    'types',          // TypeScript definitions
    'services',       // service barrel exports
  ],
};

/**
 * Seleziona modello basato su task E modulo
 * Logica: verification sempre Haiku (cheap), generation dipende dal tier
 */
export function selectModel(task, moduleName = null) {
  // task: 'verify' | 'generate' | 'refine'

  // VERIFICATION: sempre Haiku (cheap, fast)
  if (task === 'verify') {
    return 'claude-haiku-4-5';
  }

  // REFINEMENT/RETRY: sempre Opus (best quality)
  if (task === 'refine') {
    return 'claude-opus-4-7';
  }

  // GENERATION: dipende dalla complessità del modulo
  if (task === 'generate' && moduleName) {
    if (MODULE_COMPLEXITY_TIERS.TIER_1_CRITICAL_OPUS.includes(moduleName)) {
      return 'claude-opus-4-7';
    }
    if (MODULE_COMPLEXITY_TIERS.TIER_2_HIGH_SONNET.includes(moduleName)) {
      return 'claude-sonnet-4-6';
    }
    if (MODULE_COMPLEXITY_TIERS.TIER_3_MEDIUM_SONNET.includes(moduleName)) {
      return 'claude-sonnet-4-6';
    }
    if (MODULE_COMPLEXITY_TIERS.TIER_4_UTILITY_HAIKU.includes(moduleName)) {
      return 'claude-haiku-4-5';
    }
  }

  // Fallback: Sonnet (safe default)
  return 'claude-sonnet-4-6';
}
