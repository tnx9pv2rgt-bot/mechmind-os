import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DPA | MechMind OS',
  description:
    'Accordo sul Trattamento dei Dati (DPA) di MechMind OS. Informazioni sulla gestione e protezione dei dati secondo il GDPR.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='mt-10'>
      <h2 className='text-[20px] font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight'>
        {title}
      </h2>
      <div className='mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed space-y-3'>
        {children}
      </div>
    </section>
  );
}

export default function DpaPage() {
  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] px-6 py-12'>
      <div className='mx-auto max-w-2xl'>
        <h1 className='text-[28px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight'>
          Accordo sul Trattamento dei Dati (DPA)
        </h1>
        <p className='mt-2 text-[13px] text-[var(--text-tertiary)]'>
          Ultimo aggiornamento: maggio 2026
        </p>
        <p className='mt-4 text-[15px] text-[var(--text-secondary)] leading-relaxed'>
          Il presente Accordo sul Trattamento dei Dati (Data Processing Agreement &mdash; DPA)
          disciplina il trattamento dei dati personali tra Nexo S.r.l. (Titolare del Trattamento) e
          l&apos;Utente della piattaforma MechMind OS (Responsabile del Trattamento dei dati dei
          clienti), in conformit&agrave; al Regolamento (UE) 2016/679 (GDPR) e alla normativa
          italiana in materia di protezione dei dati personali.
        </p>

        <Section title='1. Definizioni'>
          <p>Ai fini del presente accordo, si intendono per:</p>
          <ul className='list-disc list-inside space-y-2 pl-1 mt-2'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati Personali:
              </span>{' '}
              qualsiasi informazione riguardante una persona fisica identificata o identificabile,
              secondo l&apos;articolo 4 GDPR.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Titolare del Trattamento:
              </span>{' '}
              Nexo S.r.l., che agisce come titolare per il trattamento dei dati degli utenti della
              piattaforma.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Responsabile del Trattamento:
              </span>{' '}
              L&apos;Utente della piattaforma, che agisce come responsabile per il trattamento dei
              dati personali dei propri clienti.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati di Interesse:
              </span>{' '}
              Dati personali e dati relativi ai veicoli trattati tramite la piattaforma MechMind OS.
            </li>
          </ul>
        </Section>

        <Section title='2. Oggetto e Finalit&agrave;'>
          <p>
            Nexo S.r.l., nella qualit&agrave; di Responsabile del Trattamento ai sensi
            dell&apos;articolo 28 del GDPR, si impegna a trattare i Dati di Interesse esclusivamente
            secondo le istruzioni fornite dal Titolare (Utente) e in conformit&agrave; alle
            finalit&agrave; indicate nel presente accordo.
          </p>
          <p>Le finalit&agrave; del trattamento includono:</p>
          <ul className='list-disc list-inside space-y-2 pl-1 mt-2'>
            <li>
              Erogazione dei servizi della piattaforma MechMind OS (gestione clienti, veicoli,
              prenotazioni, fatturazione)
            </li>
            <li>Elaborazione di istruzioni operative fornite dal Titolare</li>
            <li>
              Manutenzione e miglioramento della piattaforma secondo le specifiche tecniche
              concordate
            </li>
            <li>Conformit&agrave; agli obblighi legali e normativi</li>
            <li>
              Durante il periodo di beta gratuita, utilizzo dei dati per il miglioramento del
              servizio, nel rispetto del presente accordo e delle norme GDPR
            </li>
          </ul>
        </Section>

        <Section title='3. Istruzioni del Titolare'>
          <p>
            Il Titolare del Trattamento si impegna a fornire istruzioni scritte chiare e dettagliate
            al Responsabile riguardanti:
          </p>
          <ul className='list-disc list-inside space-y-2 pl-1 mt-2'>
            <li>Natura, ambito, contesto e finalit&agrave; del trattamento</li>
            <li>Tipologie di dati personali da trattare</li>
            <li>Categorie di interessati e soggetti terzi destinatari dei dati</li>
            <li>Periodo di conservazione dei dati</li>
            <li>Misure di sicurezza e riservatezza richieste</li>
            <li>Diritti degli interessati ai sensi degli articoli 15-22 GDPR</li>
          </ul>
          <p className='mt-3'>
            Le istruzioni sono comunicate al Responsabile attraverso: (a) i Termini di Servizio; (b)
            la presente Privacy Policy; (c) comunicazioni scritte specifiche. Le istruzioni verbali
            non sono valide a meno che non siano successivamente confermate per iscritto.
          </p>
        </Section>

        <Section title='4. Misure di Sicurezza'>
          <p>
            Nexo S.r.l. adotta misure tecniche e organizzative appropriate per garantire un livello
            di sicurezza adeguato al rischio, come previsto dall&apos;articolo 32 del GDPR:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-3 mt-3'>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Crittografia
              </p>
              <p>
                Dati a riposo: AES-256-CBC. Dati in transito: TLS 1.3 (certificati X.509 validi).
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Accesso e Autenticazione
              </p>
              <p>
                Controllo degli accessi basato su ruoli (RBAC). Autenticazione multi-fattore (MFA)
                opzionale. Supporto WebAuthn (passkey).
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Backup
              </p>
              <p>
                Backup automatici giornalieri con conservazione per 30 giorni. Ubicazione: data
                center UE (AWS Francoforte).
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Isolamento dei Dati
              </p>
              <p>
                Row Level Security (RLS) su PostgreSQL per isolamento multi-tenant. Dati di un
                tenant non accessibili ad altri.
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Monitoraggio
              </p>
              <p>
                Logging continuo di accessi e operazioni sui dati. Alerting automatico per
                attivit&agrave; sospette. Audit trail conservato per 12 mesi.
              </p>
            </div>
          </div>
        </Section>

        <Section title='5. Sub-Responsabili'>
          <p>
            Nexo S.r.l. utilizza i seguenti sub-responsabili del trattamento, nominati ai sensi
            dell&apos;articolo 28(2) e 28(4) del GDPR:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-3 mt-3'>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Supabase (PostgREST + PostgreSQL)
              </p>
              <p>
                Hosting di database e API. Ubicazione: EU (Francoforte). Accordo di elaborazione
                conforme GDPR in atto.
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Vercel
              </p>
              <p>
                Hosting frontend e CDN globale. Ubicazione: multi-region UE. Accordo di elaborazione
                conforme GDPR in atto.
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Amazon Web Services (AWS)
              </p>
              <p>
                Servizi di cloud computing (compute, storage, backup). Regione: eu-central-1
                (Francoforte). Accordo di elaborazione conforme GDPR in atto.
              </p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Resend / Twilio
              </p>
              <p>
                Invio email e SMS transazionali. Dati limitati ai destinatari e contenuti delle
                comunicazioni. Accordi DPA standard in atto.
              </p>
            </div>
          </div>
          <p className='mt-3'>
            Il Titolare del Trattamento autorizza il Responsabile a nominare sub-responsabili,
            previa notifica. Qualsiasi modifica nell&apos;elenco dei sub-responsabili sar&agrave;
            comunicata almeno 30 giorni prima dell&apos;implementazione.
          </p>
        </Section>

        <Section title='6. Diritti degli Interessati'>
          <p>
            Nexo S.r.l. si impegna a facilitare l&apos;esercizio dei diritti dei dati personali nei
            termini previsti dagli articoli 15-22 del GDPR:
          </p>
          <ul className='list-disc list-inside space-y-2 pl-1 mt-2'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 15 &mdash; Diritto di accesso:
              </span>{' '}
              L&apos;interessato pu&ograve; richiedere conferma e copia dei propri dati in formato
              leggibile da dispositivi automatici (JSON, CSV).
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 16 &mdash; Diritto di rettifica:
              </span>{' '}
              Correzione di dati inesatti o integrazione di dati incompleti.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 17 &mdash; Diritto all&apos;oblio:
              </span>{' '}
              Cancellazione dei dati, salvo obblighi legali di conservazione.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 18 &mdash; Diritto alla limitazione:
              </span>{' '}
              Blocco del trattamento in caso di contestazione dell&apos;esattezza o nella
              sospensione della liceità.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 20 &mdash; Diritto alla portabilità:
              </span>{' '}
              Esportazione dei dati in formato strutturato (JSON/CSV) tramite funzioni integrate
              della piattaforma.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 21 &mdash; Diritto di opposizione:
              </span>{' '}
              Opposizione al trattamento per motivi legittimi.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 22 &mdash; Decisioni automatizzate:
              </span>{' '}
              Protezione da decisioni basate unicamente su elaborazione automatizzata.
            </li>
          </ul>
          <p className='mt-3'>
            Le richieste saranno evase entro 30 giorni dal ricevimento. Il costo per eventuali copie
            aggiuntive pu&ograve; essere determinato secondo la normativa vigente.
          </p>
        </Section>

        <Section title='7. Durata e Cancellazione dei Dati'>
          <p>
            I dati personali sono conservati per il periodo strettamente necessario alle
            finalit&agrave; indicate, secondo i seguenti criteri:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] mt-3'>
            <table className='w-full'>
              <thead>
                <tr className='text-left border-b border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <th className='pb-2 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Categoria
                  </th>
                  <th className='pb-2 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Durata
                  </th>
                </tr>
              </thead>
              <tbody className='space-y-1'>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Dati account e fatturazione</td>
                  <td className='py-2'>Durata del rapporto + 10 anni (obblighi fiscali)</td>
                </tr>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Dati dei veicoli e clienti</td>
                  <td className='py-2'>Durata del rapporto</td>
                </tr>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Log di navigazione e accesso</td>
                  <td className='py-2'>12 mesi</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4'>Backup</td>
                  <td className='py-2'>30 giorni</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className='mt-3'>
            Alla scadenza dei termini di conservazione, i dati vengono cancellati tramite
            soft-delete (marcatura come cancellati con timestamp) e successivamente rimossi in modo
            definitivo dalle copie di backup. La cancellazione definitiva avviene tramite shredding
            crittografico per garantire irreversibilit&agrave;.
          </p>
        </Section>

        <Section title='8. Contatti'>
          <p>
            Per qualsiasi domanda relativa al presente accordo, alle misure di sicurezza o ai
            diritti degli interessati:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-1 mt-3'>
            <p>
              Email DPA:{' '}
              <a
                href='mailto:dpa@mechmind.it'
                className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] underline underline-offset-2'
              >
                dpa@mechmind.it
              </a>
            </p>
            <p>
              Email Privacy:{' '}
              <a
                href='mailto:privacy@mechmind.it'
                className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] underline underline-offset-2'
              >
                privacy@mechmind.it
              </a>
            </p>
            <p>Sede legale: Via Example 10, 00100 Roma (RM), Italia</p>
          </div>
        </Section>

        <div className='mt-12 pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
          <nav className='flex items-center gap-1 text-footnote text-[var(--text-tertiary)]'>
            <Link
              href='/privacy'
              className='text-[var(--text-primary)] dark:text-[var(--text-primary)] font-medium hover:opacity-70 transition-opacity'
            >
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link
              href='/terms'
              className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors'
            >
              Condizioni di Utilizzo
            </Link>
            <span>&middot;</span>
            <Link
              href='/dpa'
              className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors'
            >
              DPA
            </Link>
          </nav>
          <Link
            href='/auth'
            className='mt-6 inline-flex items-center text-[14px] font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:opacity-70 transition-opacity'
          >
            &larr; Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
