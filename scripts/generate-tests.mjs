#!/usr/bin/env node
/**
 * Generatore di test con prompt caching Anthropic — PATH B con verifica modulo.
 *
 * Uso:
 *   node scripts/generate-tests.mjs <modulo>           # Genera tutti i service
 *   node scripts/generate-tests.mjs <modulo> --dry-run # Preview senza API call
 *   node scripts/generate-tests.mjs <modulo> --force   # Salta verifica (score < 70)
 *
 * Flusso:
 *   1. Verifica modulo (score ≥70 richiesto)
 *   2. Trova tutti i service
 *   3. Preview file che saranno generati
 *   4. Chiede conferma (skip se --force)
 *   5. Genera spec.ts per ogni service via Anthropic API
 *   6. Esegue Jest e raccoglie coverage
 *   7. Aggiorna MODULI_NEXO.md senza duplicati
 *
 * Richiede: ANTHROPIC_API_KEY in .env o nella shell.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'fs';
import { join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { tmpdir } from 'os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND_SRC = join(ROOT, 'backend', 'src');
const PRISMA_SCHEMA = join(ROOT, 'backend', 'prisma', 'schema.prisma');
const MODULI_FILE = join(ROOT, 'MODULI_NEXO.md');

// ─── Carica API key da .env se presente ───────────────────────────────────────

function loadEnvKey() {
  const envPath = join(ROOT, 'backend', '.env');
  if (!existsSync(envPath)) return;
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (m) process.env.ANTHROPIC_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch (e) {
    // Ignora errori di lettura (no perms, etc.) — API key deve essere in shell env
  }
}
loadEnvKey();

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let moduleName = null;
let dryRun = false;
let skipVerify = false;
let force = false;

for (const arg of args) {
  if (arg === '--dry-run') dryRun = true;
  else if (arg === '--skip-verify') skipVerify = true;
  else if (arg === '--force') force = true;
  else if (!arg.startsWith('--')) moduleName = arg;
}

if (!moduleName) {
  console.error('Uso: node scripts/generate-tests.mjs <modulo> [--dry-run] [--force] [--skip-verify]');
  console.error('Moduli disponibili: booking, auth, customer, estimate, invoice, ...');
  process.exit(1);
}

// ─── Trova TUTTI i .service.ts nel modulo ────────────────────────────────────

function findAllServices(moduleName) {
  const moduleDir = join(BACKEND_SRC, moduleName);
  const results = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir).sort()) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.service.ts') && !entry.endsWith('.spec.ts')) {
        results.push(fullPath);
      }
    }
  }

  walk(moduleDir);
  return results.sort();
}

// ─── Esegui verifica modulo (JSON output) ──────────────────────────────────────

function runVerification(moduleName) {
  const result = spawnSync(
    'node',
    [join(ROOT, 'scripts', 'verify-module.mjs'), moduleName, '--json'],
    { encoding: 'utf8' }
  );

  if (result.status === 2) {
    throw new Error(`Modulo non trovato: ${moduleName}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.error('❌ Errore parsing JSON da verify-module:', result.stdout);
    throw e;
  }
}

// ─── Chiedi conferma (approval gate) ───────────────────────────────────────────

function askConfirmation(question) {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

// ─── Aggiorna MODULI_NEXO.md senza duplicati ──────────────────────────────────

function updateModuliNexo(moduleName, serviceName, stmt, branch, esito) {
  const data = new Date()
    .toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', '');

  const newRow = `| \`${data}\` | backend | \`${moduleName}\` | \`${serviceName}\` | ${stmt} / ${branch} | ${esito} |`;

  let content = readFileSync(MODULI_FILE, 'utf8');
  const lines = content.split('\n');

  // Trova indice della sezione log
  const logIdx = lines.findIndex(l => l.includes('## Log completamenti automatici'));
  if (logIdx === -1) {
    console.error('⚠️  Non trovata sezione "## Log completamenti automatici" in MODULI_NEXO.md');
    return;
  }

  // Trova riga AUTO-LOG header
  const autoLogIdx = lines.findIndex((l, i) => i > logIdx && l.includes('<!-- AUTO-LOG'));
  const insertPoint = autoLogIdx !== -1 ? autoLogIdx + 1 : lines.length;

  // Controlla se esiste già una riga per questo modulo + service
  const existingIdx = lines.findIndex(
    (l, i) =>
      i > logIdx &&
      l.includes(`| \`${moduleName}\` |`) &&
      l.includes(`| \`${serviceName}\` |`)
  );

  if (existingIdx !== -1) {
    // Aggiorna la riga esistente (no duplicati)
    lines[existingIdx] = newRow;
  } else {
    // Aggiungi nuova riga
    lines.splice(insertPoint, 0, newRow);
  }

  writeFileSync(MODULI_FILE, lines.join('\n'));
}

// ─── Legge ricorsivamente tutti i .ts sorgente (no spec, no module) ───────────

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
        path: relative(ROOT, fullPath),
        content: readFileSync(fullPath, 'utf8'),
      });
    }
  }
  return files;
}

// ─── Estrae modelli Prisma pertinenti al modulo ───────────────────────────────

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

// ─── System prompt fisso (cachato) ───────────────────────────────────────────

const SYSTEM = `Sei un senior TypeScript engineer specializzato in NestJS testing per MechMind OS.

## Pattern test obbligatorio

\`\`\`typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TheService } from './the.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-uuid-001';

function mockEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'uuid-001', tenantId: TENANT_ID, createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

describe('TheService', () => {
  let service: TheService;
  let prisma: { modelName: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      modelName: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TheService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TheService);
  });

  describe('create', () => {
    it('crea con successo', async () => { /* ... */ });
    it('lancia ConflictException se duplicato', async () => { /* ... */ });
  });
});
\`\`\`

## Regole OBBLIGATORIE
- Ogni mock Prisma DEVE includere \`tenantId: TENANT_ID\` nel where
- Testa: happy path, NotFoundException, ConflictException, BadRequestException
- Per state machine: testa transizioni valide E invalide
- Mock tutti i servizi iniettati: PrismaService, EncryptionService, QueueService, LoggerService, EventEmitter2
- Niente \`any\` TypeScript
- Coverage target: statements ≥80%, branches ≥75%

## Output
Restituisci SOLO il codice TypeScript del file .spec.ts completo. Niente markdown, niente commenti meta.`;

// ─── Coverage Threshold (90%) ────────────────────────────────────────────────

const COVERAGE_THRESHOLD = {
  statements: 90,
  branches: 90,
};

// ─── Helper: Estrai coverage da output Jest ────────────────────────────────────

function extractCoverageFromJest(output) {
  const stmtMatch = output.match(/Statements\s*:\s*([0-9.]+)%/);
  const branchMatch = output.match(/Branches\s*:\s*([0-9.]+)%/);
  const stmtNum = stmtMatch ? parseFloat(stmtMatch[1]) : 0;
  const branchNum = branchMatch ? parseFloat(branchMatch[1]) : 0;

  return {
    stmt: stmtMatch ? stmtMatch[1] + '%' : '?%',
    branch: branchMatch ? branchMatch[1] + '%' : '?%',
    stmtNum,
    branchNum,
    passed: stmtNum >= COVERAGE_THRESHOLD.statements && branchNum >= COVERAGE_THRESHOLD.branches,
  };
}

// ─── Helper: Crea temp directory atomica ──────────────────────────────────────

function createAtomicTemp(moduleName) {
  const tempBase = mkdtempSync(join(tmpdir(), `nexo-gen-${moduleName}-`));
  return tempBase;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
    console.error('❌  ANTHROPIC_API_KEY non trovata. Impostala nella shell o in backend/.env');
    process.exit(1);
  }

  // ─── Step 1: Verifica modulo ──────────────────────────────────────────────

  console.error(`\n🔍 Verifica modulo "${moduleName}"...`);

  let verificationResult;
  try {
    verificationResult = runVerification(moduleName);
  } catch (err) {
    console.error(`❌  ${err.message}`);
    process.exit(2);
  }

  const { score, approved, gaps } = verificationResult;
  console.error(`   Score: ${score}/100 ${approved ? '✅' : '⚠️'}`);

  if (!approved && !force) {
    console.error(`\n❌  Score ${score}/100 < 70. Richieste fix prima di generare:`);
    Object.entries(gaps).forEach(([category, items]) => {
      items.forEach(item => console.error(`   - [${category}] ${item}`));
    });
    console.error(`\nRitenta dopo i fix, o usa --force per forzare generazione.`);
    process.exit(1);
  }

  if (!approved && force) {
    console.error(`⚠️  Forcing generazione con score ${score}/100 (not recommended)`);
  }

  // ─── Step 2: Trova tutti i service ────────────────────────────────────────

  const allServices = findAllServices(moduleName);
  if (allServices.length === 0) {
    console.error(`❌  Nessun .service.ts trovato in modulo "${moduleName}"`);
    process.exit(1);
  }

  console.error(`\n📦 Trovati ${allServices.length} service:`);
  allServices.forEach(p => console.error(`   - ${relative(ROOT, p)}`));

  // ─── Step 3: Preview file che saranno generati ────────────────────────────

  console.error(`\n📋 Preview generazione:`);
  const specFiles = allServices.map(p => p.replace(/\.service\.ts$/, '.service.spec.ts'));
  specFiles.forEach(p => {
    const status = existsSync(p) ? '↻ OVERWRITE' : '+ NEW';
    console.error(`   ${status}: ${relative(ROOT, p)}`);
  });

  // ─── Step 4: Chiedi conferma (skip se --force o --dry-run) ────────────────

  if (!dryRun && !force && process.stdin.isTTY) {
    const confirmed = await askConfirmation(`\nProcedere? [y/N] `);
    if (!confirmed) {
      console.error('Annullato.');
      process.exit(0);
    }
  }

  if (dryRun) {
    console.error('\n✅  Dry-run completato. Nessun file generato.');
    process.exit(0);
  }

  // ─── Step 5-7: Atomic workflow (RAM temp → disk se coverage OK) ─────────────

  const client = new Anthropic();
  const originalModuleDir = join(BACKEND_SRC, moduleName);
  let tempDir = null;

  try {
    // Crea temp directory
    tempDir = createAtomicTemp(moduleName);
    const tempModuleDir = join(tempDir, 'backend', 'src', moduleName);
    console.error(`\n🔧 Creato workspace temporaneo: ${relative(ROOT, tempDir)}`);

    // Copia modulo in temp
    cpSync(originalModuleDir, tempModuleDir, { recursive: true });
    console.error(`   ✅ Modulo copiato in RAM`);

    // Leggi sorgenti da temp
    const sourceFiles = readSourceFiles(tempModuleDir);
    const schema = existsSync(PRISMA_SCHEMA) ? readFileSync(PRISMA_SCHEMA, 'utf8') : '';
    const prismaModels = extractPrismaModels(schema, moduleName);

    const sourceBlock = [
      prismaModels ? `// ═══ Prisma Schema — modelli rilevanti ═══\n${prismaModels}` : '',
      ...sourceFiles.map(f => `// ═══ ${f.path} ═══\n${f.content}`),
    ].filter(Boolean).join('\n\n');

    const tokenEstimate = Math.round(sourceBlock.length / 4);
    console.error(`\n⚙️  Generazione tramite Anthropic API...`);
    console.error(`   ${sourceFiles.length} file caricati (~${tokenEstimate.toLocaleString()} token)`);
    console.error(`\n   Generando ${allServices.length} spec file in RAM:`);

    // Genera spec in temp
    for (let i = 0; i < allServices.length; i++) {
      const originalPath = allServices[i];
      const relativePath = relative(originalModuleDir, originalPath);
      const tempServicePath = join(tempModuleDir, relativePath);
      const tempSpecPath = tempServicePath.replace(/\.service\.ts$/, '.service.spec.ts');
      const serviceBaseName = relative(BACKEND_SRC, originalPath).replace(/\.service\.ts$/, '.service');

      console.error(`   [${i + 1}/${allServices.length}] ${serviceBaseName}.spec.ts...`);

      const prompt =
        i === 0
          ? `Genera il file .spec.ts completo per il service principale \`${serviceBaseName}\` del modulo \`${moduleName}\`.`
          : `Genera il file .spec.ts completo per il service \`${serviceBaseName}\` del modulo \`${moduleName}\`.`;

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          thinking: { type: 'adaptive', display: 'omitted' },
          output_config: { effort: 'medium' },
          system: [
            {
              type: 'text',
              text: SYSTEM,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: sourceBlock,
                  cache_control: { type: 'ephemeral' },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        });

        const u = response.usage;
        const cacheWrite = u.cache_creation_input_tokens ?? 0;
        const cacheRead = u.cache_read_input_tokens ?? 0;

        if (i === 0 && cacheWrite > 0) {
          console.error(`       ⚡ Cache write: ${cacheWrite.toLocaleString()} token`);
        }
        if (i > 0 && cacheRead > 0) {
          const saved = Math.round(cacheRead * 0.9);
          console.error(`       ✅ Cache read: -${saved.toLocaleString()} token`);
        }

        const textBlock = response.content.find(b => b.type === 'text');
        if (!textBlock) {
          console.error(`       ❌ Nessun output ricevuto`);
          continue;
        }

        writeFileSync(tempSpecPath, textBlock.text + '\n');
        console.error(`       ✅ Generato in RAM`);
      } catch (err) {
        console.error(`       ❌ Errore: ${err.message}`);
        throw err;
      }
    }

    // ─── Esegui Jest in temp ─────────────────────────────────────────────

    console.error(`\n🧪 Jest in RAM (coverage ≥${COVERAGE_THRESHOLD.statements}%)...`);
    const jestResult = spawnSync('npx', ['jest', `--testPathPattern=${moduleName}`, '--forceExit', '--coverage'], {
      cwd: join(tempDir, 'backend'),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const jestOutput = jestResult.stdout + jestResult.stderr;
    const coverage = extractCoverageFromJest(jestOutput);

    // Mostra output Jest
    console.error('\n   Risultati:');
    const jestLines = jestOutput.split('\n').slice(-12);
    jestLines.forEach(l => {
      if (l.trim()) console.error(`   ${l}`);
    });

    // ─── Verifica coverage (ATOMIC GATE) ──────────────────────────────────

    console.error(`\n📊 Controllo coverage...`);
    console.error(`   Statements: ${coverage.stmt} (richiesto: ≥${COVERAGE_THRESHOLD.statements}%)`);
    console.error(`   Branches: ${coverage.branch} (richiesto: ≥${COVERAGE_THRESHOLD.branches}%)`);

    if (!coverage.passed) {
      console.error(`\n❌  Coverage insufficiente! Requisiti non soddisfatti.`);
      console.error(`   RAM workspace rimosso (atomic rollback).`);
      rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }

    // ─── Coverage OK: copia da temp a disk ───────────────────────────────

    console.error(`\n✅  Coverage raggiunto! Trasferimento a disk...`);
    for (let i = 0; i < allServices.length; i++) {
      const originalPath = allServices[i];
      const relativePath = relative(originalModuleDir, originalPath);
      const tempServicePath = join(tempModuleDir, relativePath);
      const tempSpecPath = tempServicePath.replace(/\.service\.ts$/, '.service.spec.ts');
      const specPath = originalPath.replace(/\.service\.ts$/, '.service.spec.ts');

      if (existsSync(tempSpecPath)) {
        const specContent = readFileSync(tempSpecPath, 'utf8');
        writeFileSync(specPath, specContent);
        console.error(`   ✅ ${relative(ROOT, specPath)}`);
      }
    }

    // ─── Aggiorna MODULI_NEXO.md ────────────────────────────────────────

    console.error(`\n📝 Aggiornamento MODULI_NEXO.md...`);
    const esito = '✅ Testato';
    allServices.forEach(servicePath => {
      const serviceBaseName = relative(BACKEND_SRC, servicePath).replace(/\.service\.ts$/, '');
      updateModuliNexo(moduleName, serviceBaseName, coverage.stmt, coverage.branch, esito);
    });

    console.error(`   ✅ ${allServices.length} righe aggiornate/aggiunte`);
    console.error(`\n✅  COMPLETATO: ${moduleName}`);
    console.error(`   Coverage: ${coverage.stmt} / ${coverage.branch}`);
    console.error(`   File trasferiti dal RAM al disco`);
  } finally {
    // Cleanup: cancella temp directory se ancora esiste
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
      console.error(`\n🧹 Workspace RAM ripulito`);
    }
  }
}

main().catch(err => {
  console.error(`❌  Errore: ${err.message}`);
  process.exit(1);
});
