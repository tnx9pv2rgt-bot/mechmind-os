import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informativa sulla Privacy | MechMind OS',
  description:
    'Informativa sulla privacy di MechMind OS. Scopri come proteggiamo i tuoi dati personali e garantiamo la conformità al GDPR.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='mt-10'>
      <h2 className='text-[20px] font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight'>
        {title}
      </h2>
      <div className='mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed space-y-3'>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] px-6 py-12'>
      <div className='mx-auto max-w-2xl'>
        <h1 className='text-[28px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight'>
          Informativa sulla Privacy
        </h1>
        <p className='mt-2 text-[13px] text-[var(--text-tertiary)]'>Ultimo aggiornamento: marzo 2026</p>
        <p className='mt-4 text-[15px] text-[var(--text-secondary)] leading-relaxed'>
          La presente informativa descrive come Nexo S.r.l. raccoglie, utilizza e protegge i dati
          personali degli utenti della piattaforma MechMind OS, in conformit&agrave; al Regolamento
          (UE) 2016/679 (GDPR) e al D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018.
        </p>

        <Section title='1. Titolare del trattamento'>
          <p>Il Titolare del trattamento dei dati personali &egrave;:</p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-1'>
            <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Nexo S.r.l.</p>
            <p>Sede legale: Via Example 10, 00100 Roma (RM), Italia</p>
            <p>P.IVA: 00000000000</p>
            <p>PEC: nexo@pec.example.it</p>
            <p>Email DPO: privacy@nexo.dev</p>
          </div>
        </Section>

        <Section title='2. Dati raccolti'>
          <p>
            Nell&apos;ambito dell&apos;erogazione del servizio MechMind OS, raccogliamo le seguenti
            categorie di dati personali:
          </p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati identificativi:
              </span>{' '}
              nome, cognome, indirizzo email, numero di telefono, codice fiscale o partita IVA (ove
              necessario per la fatturazione).
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati del veicolo:
              </span>{' '}
              targa, marca, modello, anno di immatricolazione, chilometraggio e storico degli
              interventi di manutenzione e riparazione.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati di navigazione:
              </span>{' '}
              indirizzo IP, tipo di browser, sistema operativo, pagine visitate, durata della
              sessione e dati raccolti tramite cookie tecnici e, previo consenso, cookie analytics.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Dati di pagamento:
              </span>{' '}
              elaborati direttamente da Stripe Inc. in qualit&agrave; di responsabile del
              trattamento. Nexo S.r.l. non memorizza numeri di carta di credito.
            </li>
          </ul>
          <p>
            I dati personali sensibili (nome, cognome, email, telefono) sono crittografati a riposo
            tramite algoritmo AES-256-CBC.
          </p>
        </Section>

        <Section title='3. Finalit&agrave; del trattamento'>
          <p>I dati personali sono trattati per le seguenti finalit&agrave;:</p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Erogazione del servizio:
              </span>{' '}
              creazione e gestione dell&apos;account, accesso alla piattaforma, gestione delle
              officine e dei relativi dati operativi.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Gestione prenotazioni:
              </span>{' '}
              pianificazione e conferma degli appuntamenti di manutenzione e riparazione.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Comunicazioni di servizio:
              </span>{' '}
              invio di notifiche relative allo stato degli interventi, promemoria appuntamenti e
              aggiornamenti del servizio tramite email e SMS.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Fatturazione:</span>{' '}
              emissione di fatture, gestione dei pagamenti e adempimento degli obblighi fiscali e
              contabili.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Analisi aggregate anonime:
              </span>{' '}
              elaborazione di statistiche aggregate e anonimizzate per il miglioramento del servizio
              e delle funzionalit&agrave; della piattaforma.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Marketing (facoltativo):
              </span>{' '}
              previo consenso esplicito, invio di comunicazioni promozionali e offerte
              personalizzate.
            </li>
          </ul>
        </Section>

        <Section title='4. Base giuridica del trattamento'>
          <p>Il trattamento dei dati si fonda sulle seguenti basi giuridiche:</p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 6(1)(b) GDPR
              </span>{' '}
              &mdash; esecuzione del contratto: il trattamento &egrave; necessario per
              l&apos;erogazione del servizio richiesto dall&apos;utente.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 6(1)(a) GDPR
              </span>{' '}
              &mdash; consenso: per l&apos;invio di comunicazioni di marketing e l&apos;utilizzo di
              cookie analytics.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 6(1)(c) GDPR
              </span>{' '}
              &mdash; obbligo legale: per gli adempimenti fiscali, contabili e di conservazione
              documentale previsti dalla normativa italiana.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Art. 6(1)(f) GDPR
              </span>{' '}
              &mdash; legittimo interesse: per la prevenzione di frodi, la sicurezza della
              piattaforma e l&apos;analisi di dati aggregati e anonimi.
            </li>
          </ul>
        </Section>

        <Section title='5. Destinatari dei dati'>
          <p>
            I dati personali possono essere comunicati ai seguenti soggetti terzi, nominati
            responsabili del trattamento ai sensi dell&apos;art. 28 GDPR:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-3'>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Amazon Web Services (AWS)
              </p>
              <p>Hosting e infrastruttura cloud &mdash; Regione UE (Francoforte)</p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Resend Inc.</p>
              <p>Invio email transazionali e di servizio</p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Twilio Inc.</p>
              <p>Invio SMS di notifica e comunicazioni di servizio</p>
            </div>
            <div>
              <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Stripe Inc.</p>
              <p>Elaborazione dei pagamenti e gestione degli abbonamenti</p>
            </div>
          </div>
          <p>
            Per i sub-responsabili con sede negli Stati Uniti, il trasferimento dei dati avviene
            sulla base del EU-U.S. Data Privacy Framework o, in subordine, delle Clausole
            Contrattuali Standard (SCC) approvate dalla Commissione Europea. Nessun trasferimento di
            dati personali avviene verso paesi terzi privi di garanzie adeguate.
          </p>
        </Section>

        <Section title='6. Conservazione dei dati'>
          <p>I dati personali sono conservati per i seguenti periodi:</p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px]'>
            <table className='w-full'>
              <thead>
                <tr className='text-left border-b border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <th className='pb-2 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Categoria</th>
                  <th className='pb-2 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Durata</th>
                </tr>
              </thead>
              <tbody className='space-y-1'>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Dati account e fatturazione</td>
                  <td className='py-2'>
                    Durata del rapporto + 10 anni (obbligo fiscale ex art. 2220 c.c.)
                  </td>
                </tr>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Dati dei veicoli</td>
                  <td className='py-2'>Durata del rapporto contrattuale</td>
                </tr>
                <tr className='border-b border-[var(--border-default)]/50 dark:border-[var(--border-default)]/50'>
                  <td className='py-2 pr-4'>Log di navigazione</td>
                  <td className='py-2'>12 mesi</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4'>Backup</td>
                  <td className='py-2'>30 giorni</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Alla scadenza dei termini di conservazione, i dati vengono cancellati in modo sicuro o
            anonimizzati in modo irreversibile. La cancellazione avviene tramite soft-delete con
            successiva rimozione definitiva secondo le policy interne GDPR.
          </p>
        </Section>

        <Section title="7. Diritti dell'interessato">
          <p>Ai sensi degli articoli 15-22 del GDPR, l&apos;interessato ha diritto di:</p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Accesso</span>{' '}
              &mdash; ottenere conferma del trattamento e copia dei propri dati personali.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Rettifica</span>{' '}
              &mdash; ottenere la correzione di dati inesatti o l&apos;integrazione di dati
              incompleti.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Cancellazione</span>{' '}
              &mdash; ottenere la cancellazione dei propri dati, salvo obblighi di legge.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Portabilit&agrave;
              </span>{' '}
              &mdash; ricevere i propri dati in formato strutturato e leggibile da dispositivo
              automatico (JSON/CSV).
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Opposizione</span>{' '}
              &mdash; opporsi al trattamento per motivi legittimi.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Limitazione</span>{' '}
              &mdash; ottenere la limitazione del trattamento nei casi previsti dalla legge.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Revoca del consenso
              </span>{' '}
              &mdash; revocare in qualsiasi momento il consenso prestato, senza pregiudicare la
              liceit&agrave; del trattamento effettuato prima della revoca.
            </li>
          </ul>
          <p>
            Per esercitare i propri diritti, &egrave; possibile inviare una richiesta a{' '}
            <a
              href='mailto:privacy@nexo.dev'
              className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] underline underline-offset-2'
            >
              privacy@nexo.dev
            </a>
            . La richiesta sar&agrave; evasa entro 30 giorni dal ricevimento.
          </p>
          <p>
            L&apos;interessato ha inoltre diritto di proporre reclamo all&apos;Autorit&agrave;
            Garante per la Protezione dei Dati Personali (
            <a
              href='https://www.garanteprivacy.it'
              target='_blank'
              rel='noopener noreferrer'
              className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] underline underline-offset-2'
            >
              www.garanteprivacy.it
            </a>
            ).
          </p>
        </Section>

        <Section title='8. Cookie'>
          <p>MechMind OS utilizza le seguenti tipologie di cookie:</p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Cookie tecnici (necessari):
              </span>{' '}
              indispensabili per il funzionamento della piattaforma, la gestione della sessione
              utente e le preferenze di interfaccia. Non richiedono consenso.
            </li>
            <li>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Cookie analytics (con consenso):
              </span>{' '}
              utilizzati per raccogliere dati aggregati e anonimi sull&apos;utilizzo della
              piattaforma al fine di migliorare il servizio. Installati solo previo consenso
              esplicito dell&apos;utente.
            </li>
          </ul>
          <p>
            MechMind OS non utilizza cookie di profilazione n&eacute; cookie pubblicitari di terze
            parti.
          </p>
        </Section>

        <Section title='9. Sicurezza'>
          <p>
            Nexo S.r.l. adotta misure tecniche e organizzative adeguate per proteggere i dati
            personali da accessi non autorizzati, perdita, alterazione o divulgazione, tra cui:
          </p>
          <ul className='list-disc list-inside space-y-2 pl-1'>
            <li>Crittografia dei dati a riposo (AES-256-CBC) e in transito (TLS 1.3).</li>
            <li>Isolamento dei dati tra tenant tramite Row Level Security (RLS) su PostgreSQL.</li>
            <li>Autenticazione multi-fattore (MFA) e supporto a passkey WebAuthn.</li>
            <li>Monitoraggio continuo, logging e alerting sugli accessi.</li>
            <li>Backup giornalieri con conservazione per 30 giorni.</li>
          </ul>
        </Section>

        <Section title="10. Modifiche all'informativa">
          <p>
            Nexo S.r.l. si riserva il diritto di modificare la presente informativa in qualsiasi
            momento. Le modifiche saranno comunicate tramite pubblicazione sulla piattaforma e, per
            modifiche sostanziali, tramite notifica via email. La data dell&apos;ultimo
            aggiornamento &egrave; sempre indicata in cima al presente documento.
          </p>
        </Section>

        <Section title='11. Contatti'>
          <p>
            Per qualsiasi domanda relativa al trattamento dei dati personali o alla presente
            informativa, &egrave; possibile contattarci ai seguenti recapiti:
          </p>
          <div className='rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-secondary)]/5 border border-[var(--border-default)] dark:border-[var(--border-default)] p-4 text-[14px] space-y-1'>
            <p>
              Email DPO:{' '}
              <a
                href='mailto:privacy@nexo.dev'
                className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] underline underline-offset-2'
              >
                privacy@nexo.dev
              </a>
            </p>
            <p>PEC: nexo@pec.example.it</p>
            <p>Sede legale: Via Example 10, 00100 Roma (RM), Italia</p>
          </div>
        </Section>

        <div className='mt-12 pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
          <Link
            href='/auth'
            className='inline-flex items-center text-[14px] font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:opacity-70 transition-opacity'
          >
            &larr; Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
