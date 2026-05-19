import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trust Center | Nexo Gestionale',
  description:
    'Security posture, compliance certifications, subprocessor list and vulnerability disclosure for Nexo Gestionale.',
};

function Badge({
  color,
  children,
}: {
  color: 'green' | 'yellow' | 'blue';
  children: React.ReactNode;
}) {
  const cls = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='mt-10'>
      <h2 className='text-[18px] font-semibold text-[var(--text-primary)] tracking-tight border-b border-[var(--border-default)] pb-2'>
        {title}
      </h2>
      <div className='mt-4 text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3'>
        {children}
      </div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-[var(--border-default)]'>
      <table className='min-w-full divide-y divide-[var(--border-default)] text-[13px]'>
        <thead className='bg-[var(--surface-secondary)]/40'>
          <tr>
            {headers.map(h => (
              <th
                key={h}
                className='px-4 py-2.5 text-left font-medium text-[var(--text-primary)] whitespace-nowrap'
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-[var(--border-default)] bg-[var(--surface-primary)]'>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className='px-4 py-2.5 text-[var(--text-secondary)]'>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TrustPage() {
  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] px-6 py-12'>
      <div className='mx-auto max-w-3xl'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-[28px] font-bold text-[var(--text-primary)] tracking-tight'>
              Trust Center
            </h1>
            <p className='mt-1 text-[13px] text-[var(--text-tertiary)]'>
              Aggiornato: 3 maggio 2026 · Contatto: security@mechmind.it
            </p>
          </div>
          <span
            className='flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-tertiary)] cursor-default'
            title='Status page in configurazione'
          >
            <span className='h-2 w-2 rounded-full bg-amber-400' />
            Status
          </span>
        </div>

        <p className='mt-4 text-[15px] text-[var(--text-secondary)] leading-relaxed'>
          Nexo Gestionale è un ERP multi-tenant per officine automotive. Questa pagina documenta la
          nostra postura di sicurezza, le certificazioni di conformità e le politiche di
          divulgazione delle vulnerabilità.
        </p>

        {/* Compliance badges */}
        <div className='mt-6 flex flex-wrap gap-2'>
          <Badge color='green'>GDPR ✓ Conforme</Badge>
          <Badge color='green'>EU Data Act ✓ Conforme (set. 2025)</Badge>
          <Badge color='yellow'>SOC 2 Type II — In corso (mar. 2027)</Badge>
          <Badge color='blue'>PCI DSS SAQ-A (Stripe)</Badge>
          <Badge color='green'>TLS 1.3 ✓</Badge>
          <Badge color='green'>OWASP ASVS L2 ✓</Badge>
        </div>

        {/* Encryption */}
        <Section title='Crittografia'>
          <Table
            headers={['Layer', 'Standard', 'Dettaglio']}
            rows={[
              [
                'PII a riposo',
                'AES-256-CBC',
                'Tutti i campi PII (nome, telefono, email, CF) via EncryptionService',
              ],
              ['In transito', 'TLS 1.3', 'Tutte le connessioni client↔server e server↔DB'],
              ['Password', 'bcrypt r12', 'Mai in chiaro, mai nei log'],
              ['JWT', 'RS256', 'Revocabilità via jti su Redis; scadenza 15 min / 7 giorni'],
              ['Backup DB', 'AES-256', 'Backup cifrati pre-upload S3'],
              ['Segreti', 'Env + Secrets Manager', 'Nessun secret nel codice sorgente'],
            ]}
          />
        </Section>

        {/* Access Control */}
        <Section title='Controllo Accessi'>
          <ul className='space-y-2 list-none'>
            {[
              'MFA obbligatorio per tutti gli account admin e tenant owner (TOTP / WebAuthn)',
              'RBAC granulare: OWNER, ADMIN, MANAGER, TECHNICIAN, VIEWER per ogni tenant',
              'Row-Level Security (RLS): PostgreSQL filtra automaticamente per tenant_id',
              'Session revocation: logout forza revoca JWT su Redis (blacklist jti)',
              'Access review trimestrale su tutti gli account privilegiati',
            ].map(item => (
              <li key={item} className='flex items-start gap-2'>
                <span className='mt-0.5 text-emerald-500 flex-shrink-0'>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Multi-Tenant Isolation */}
        <Section title='Isolamento Multi-Tenant'>
          <ul className='space-y-2 list-none'>
            {[
              'Dati completamente separati a livello applicativo e DB (RLS PostgreSQL)',
              'tenantId presente in ogni query Prisma — verificato da audit automatico (Semgrep custom rules)',
              'Nessuna query cross-tenant possibile da API pubblica',
              'Test di isolamento nel CI/CD pipeline (Jest + Semgrep SAST)',
            ].map(item => (
              <li key={item} className='flex items-start gap-2'>
                <span className='mt-0.5 text-emerald-500 flex-shrink-0'>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Monitoring */}
        <Section title='Monitoring e Incident Response'>
          <Table
            headers={['Sistema', 'Coverage']}
            rows={[
              [
                'Sentry',
                'Backend NestJS + Frontend Next.js — real-time error tracking, session replay',
              ],
              ['OpenTelemetry', 'Distributed tracing, p95/p99 latency per endpoint'],
              ['Pino (structured logging)', 'JSON logs, retention 365 giorni'],
              ['Uptime monitoring', 'Better Stack — statuspage pubblico su status.nexo.it'],
              ['Semgrep SAST', 'OWASP Top 10 + custom rules su ogni CI/CD run'],
              ['Penetration test', 'Annuale (pianificato Q4 2026)'],
            ]}
          />
          <p className='mt-3 text-[13px]'>
            <span className='font-medium text-[var(--text-primary)]'>MTTR target P0:</span> &lt;1
            ora. Vedi{' '}
            <Link href='/terms' className='underline hover:text-[var(--text-primary)]'>
              SLA completo
            </Link>
            .
          </p>
        </Section>

        {/* SOC 2 */}
        <Section title='SOC 2 Type II'>
          <div className='rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4'>
            <p className='font-medium text-amber-900 dark:text-amber-300'>
              🔄 In corso — avvio maggio 2026
            </p>
            <p className='mt-1 text-[13px] text-amber-800 dark:text-amber-400'>
              Observation period: luglio–dicembre 2026. Report emissione prevista: marzo 2027.
            </p>
          </div>
          <Table
            headers={['Fase', 'Periodo', 'Stato']}
            rows={[
              ['Gap assessment + Onboarding Vanta', 'Maggio 2026', '🔄 In corso'],
              ['Remediation controlli', 'Maggio–Giugno 2026', '⏳ Pianificato'],
              ['Observation period (6 mesi)', 'Luglio–Dicembre 2026', '⏳ Pianificato'],
              ['Audit fieldwork', 'Gennaio–Febbraio 2027', '⏳ Pianificato'],
              ['Report emissione', 'Marzo 2027', '⏳ Pianificato'],
            ]}
          />
          <p className='text-[13px]'>
            Il report SOC 2 Type II sarà disponibile su richiesta per clienti enterprise con NDA.
            Contatta{' '}
            <a
              href='mailto:security@mechmind.it'
              className='underline hover:text-[var(--text-primary)]'
            >
              security@mechmind.it
            </a>
            .
          </p>
        </Section>

        {/* GDPR */}
        <Section title='GDPR (Regolamento UE 2016/679)'>
          <div className='rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-3'>
            <p className='font-medium text-emerald-900 dark:text-emerald-300'>✅ Conforme</p>
          </div>
          <ul className='space-y-1.5 list-none'>
            {[
              'Lawful basis: contratto (Art. 6.1.b) per dati operativi; consenso (Art. 6.1.a) per marketing',
              'Right to erasure: endpoint POST /v1/gdpr/delete — cancellazione asincrona entro 30 giorni',
              'Right to portability: endpoint GET /v1/gdpr/export-full — export ZIP entro 72 ore',
              'Data retention: dati operativi 7 anni (obbligo fiscale IT); dati marketing 2 anni',
            ].map(item => (
              <li key={item} className='flex items-start gap-2'>
                <span className='mt-0.5 text-emerald-500 flex-shrink-0'>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Subprocessors */}
        <Section title='Sub-Responsabili del Trattamento'>
          <Table
            headers={['Fornitore', 'Scopo', 'Sede']}
            rows={[
              ['Amazon Web Services (AWS)', 'Hosting, S3 backup, CloudFront CDN', 'EU (Irlanda)'],
              ['Render', 'Deploy applicazione', 'EU (Frankfurt)'],
              ['Stripe', 'Processamento pagamenti (PCI Level 1)', 'USA / Irlanda (EU)'],
              ['Resend', 'Email transazionale', 'USA (SCC)'],
              ['Twilio', 'SMS notifiche', 'USA (SCC)'],
              ['OpenAI', 'AI diagnostica veicoli', 'USA (SCC)'],
              ['Sentry', 'Error monitoring', 'USA (SCC)'],
            ]}
          />
          <p className='text-[13px]'>
            Tutti i trasferimenti extra-UE avvengono tramite{' '}
            <span className='font-medium text-[var(--text-primary)]'>
              Standard Contractual Clauses (SCC)
            </span>{' '}
            o adequacy decision. Lista completa nel{' '}
            <a
              href='mailto:privacy@mechmind.it'
              className='underline hover:text-[var(--text-primary)]'
            >
              DPA disponibile su richiesta
            </a>
            .
          </p>
        </Section>

        {/* Vulnerability Disclosure */}
        <Section title='Vulnerability Disclosure'>
          <div className='rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/40 p-4 space-y-3'>
            <p className='font-medium text-[var(--text-primary)]'>Responsible Disclosure</p>
            <ol className='space-y-1.5 list-decimal list-inside text-[13px]'>
              <li>
                Invia email a{' '}
                <a href='mailto:security@mechmind.it' className='font-mono underline'>
                  security@mechmind.it
                </a>{' '}
                con oggetto{' '}
                <code className='bg-[var(--surface-secondary)] px-1 rounded'>
                  [VULN] descrizione breve
                </code>
              </li>
              <li>Includi: steps to reproduce, impatto stimato, proof-of-concept se disponibile</li>
              <li>Non pubblicare la vulnerabilità prima di 90 giorni dalla segnalazione</li>
            </ol>
            <Table
              headers={['Severity', 'SLA Acknowledgement', 'SLA Fix']}
              rows={[
                ['P0 / Critical', '24 ore', '7 giorni'],
                ['P1 / High', '24 ore', '30 giorni'],
                ['P2 / Medium', '72 ore', '90 giorni'],
              ]}
            />
          </div>
          <p className='text-[13px]'>
            <span className='font-medium text-[var(--text-primary)]'>Scope in-scope:</span>{' '}
            *.nexo.it — tutte le superfici web e API. Out-of-scope: social engineering, DoS,
            infrastruttura terze parti (AWS, Stripe).
          </p>
        </Section>

        {/* Contacts */}
        <Section title='Contatti'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {[
              { label: 'Security', email: 'security@mechmind.it' },
              { label: 'Privacy / DPO', email: 'privacy@mechmind.it' },
              { label: 'Generale', email: 'hello@mechmind.it' },
              { label: 'DPO', email: 'dpo@mechmind.it' },
            ].map(({ label, email }) => (
              <div
                key={label}
                className='rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/40 p-3'
              >
                <p className='text-[12px] font-medium text-[var(--text-tertiary)]'>{label}</p>
                <a
                  href={`mailto:${email}`}
                  className='mt-0.5 block text-[13px] font-medium text-[var(--text-primary)] hover:underline'
                >
                  {email}
                </a>
              </div>
            ))}
          </div>
        </Section>

        <div className='mt-10 border-t border-[var(--border-default)] pt-6 flex items-center justify-between text-[12px] text-[var(--text-tertiary)]'>
          <span>© 2026 Nexo Gestionale S.r.l.</span>
          <div className='flex gap-4'>
            <Link href='/privacy' className='hover:text-[var(--text-secondary)]'>
              Privacy
            </Link>
            <Link href='/terms' className='hover:text-[var(--text-secondary)]'>
              Termini
            </Link>
            <a href='mailto:security@mechmind.it' className='hover:text-[var(--text-secondary)]'>
              Sicurezza
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
