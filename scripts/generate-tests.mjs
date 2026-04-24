#!/usr/bin/env node
/**
 * Generatore di test con prompt caching Anthropic.
 *
 * Uso:
 *   node scripts/generate-tests.mjs <modulo>
 *   node scripts/generate-tests.mjs <modulo> <service>
 *   node scripts/generate-tests.mjs booking
 *   node scripts/generate-tests.mjs booking booking.service
 *
 * Prima chiamata: paga cache write (×1.25).
 * Chiamate successive sullo stesso modulo: cache read (×0.1) → risparmio 90%.
 *
 * Richiede: ANTHROPIC_API_KEY in .env o nella shell.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND_SRC = join(ROOT, 'backend', 'src');
const PRISMA_SCHEMA = join(ROOT, 'backend', 'prisma', 'schema.prisma');

// ─── Carica API key da .env se presente ───────────────────────────────────────

function loadEnvKey() {
  const envPath = join(ROOT, 'backend', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
    if (m) process.env.ANTHROPIC_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnvKey();

// ─── CLI ──────────────────────────────────────────────────────────────────────

const [, , moduleName, targetService] = process.argv;

if (!moduleName) {
  console.error('Uso: node scripts/generate-tests.mjs <modulo> [<service>]');
  console.error('Moduli disponibili: booking, auth, customer, estimate, invoice, ...');
  process.exit(1);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌  ANTHROPIC_API_KEY non trovata. Impostala nella shell o in backend/.env');
    process.exit(1);
  }

  const client = new Anthropic();

  const moduleDir = join(BACKEND_SRC, moduleName);
  const sourceFiles = readSourceFiles(moduleDir);

  if (sourceFiles.length === 0) {
    console.error(`❌  Nessun file trovato in: ${moduleDir}`);
    console.error(`    Controlla il nome del modulo. Moduli esistenti:`);
    readdirSync(BACKEND_SRC)
      .filter(d => statSync(join(BACKEND_SRC, d)).isDirectory())
      .forEach(d => console.error(`    - ${d}`));
    process.exit(1);
  }

  const schema = existsSync(PRISMA_SCHEMA) ? readFileSync(PRISMA_SCHEMA, 'utf8') : '';
  const prismaModels = extractPrismaModels(schema, moduleName);

  const sourceBlock = [
    prismaModels ? `// ═══ Prisma Schema — modelli rilevanti ═══\n${prismaModels}` : '',
    ...sourceFiles.map(f => `// ═══ ${f.path} ═══\n${f.content}`),
  ].filter(Boolean).join('\n\n');

  const prompt = targetService
    ? `Genera il file .spec.ts completo per \`${targetService}\` del modulo \`${moduleName}\`.`
    : `Genera il file .spec.ts completo per il service principale del modulo \`${moduleName}\`.`;

  const tokenEstimate = Math.round(sourceBlock.length / 4);
  console.error(`\n📦 ${sourceFiles.length} file caricati dal modulo "${moduleName}"`);
  console.error(`📐 Contesto stimato: ~${tokenEstimate.toLocaleString()} token`);
  console.error(`💾 Prima run: cache write (×1.25). Successive: cache read (×0.1) → -90% costo\n`);

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
            cache_control: { type: 'ephemeral' }, // ← source files cachati
          },
          {
            type: 'text',
            text: prompt, // ← solo la richiesta specifica, non cachata
          },
        ],
      },
    ],
  });

  // ─── Report token ────────────────────────────────────────────────────────

  const u = response.usage;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const inputNormal = u.input_tokens ?? 0;

  console.error('📊 Token utilizzati:');
  console.error(`   Input normali : ${inputNormal.toLocaleString()}`);
  console.error(`   Cache write   : ${cacheWrite.toLocaleString()} (×1.25)`);
  console.error(`   Cache read    : ${cacheRead.toLocaleString()} (×0.10) ← risparmio 90%`);
  console.error(`   Output        : ${u.output_tokens.toLocaleString()}`);

  if (cacheRead > 0) {
    const saved = Math.round(cacheRead * 0.9);
    console.error(`\n✅  Hai risparmiato ~${saved.toLocaleString()} token grazie al caching`);
  } else {
    console.error(`\n⚡  Primo run: contesto cachato per 5 minuti. La prossima call sarà -90%.`);
  }

  // ─── Output ──────────────────────────────────────────────────────────────

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    console.error('❌  Nessun output testuale ricevuto');
    process.exit(1);
  }

  // Scrivi su stdout — l'utente può reindirizzare su file
  process.stdout.write(textBlock.text + '\n');
}

main().catch(err => {
  console.error(`❌  Errore: ${err.message}`);
  process.exit(1);
});
