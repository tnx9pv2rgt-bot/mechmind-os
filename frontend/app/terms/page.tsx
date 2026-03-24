import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Condizioni d\'Uso | MechMind OS',
  description: 'Condizioni generali di utilizzo della piattaforma MechMind OS per la gestione delle officine automotive. Termini e regolamenti del servizio.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-[#212121] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
          Condizioni Generali di Utilizzo
        </h1>
        <p className="mt-2 text-[13px] text-[#636366]">
          Ultimo aggiornamento: 1 marzo 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] text-[#0d0d0d] dark:text-[#d1d1d1] leading-relaxed">

          {/* 1. Accettazione */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              1. Accettazione delle Condizioni
            </h2>
            <p>
              L&apos;accesso e l&apos;utilizzo della piattaforma MechMind OS (di seguito &ldquo;Servizio&rdquo;),
              fornita da MechMind S.r.l. con sede legale in Italia (di seguito &ldquo;Fornitore&rdquo;),
              sono subordinati all&apos;accettazione integrale e senza riserve delle presenti Condizioni
              Generali di Utilizzo. La registrazione di un account o l&apos;utilizzo del Servizio costituiscono
              accettazione implicita delle presenti condizioni.
            </p>
          </section>

          {/* 2. Descrizione del Servizio */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              2. Descrizione del Servizio
            </h2>
            <p>
              MechMind OS è una piattaforma SaaS (Software as a Service) multi-tenant per la gestione
              di officine meccaniche e centri di assistenza automotive. Il Servizio include, a titolo
              esemplificativo e non esaustivo: gestione clienti e veicoli, ordini di lavoro, preventivi,
              fatturazione elettronica, prenotazioni online, ispezioni digitali, gestione ricambi,
              analisi e reportistica, notifiche e comunicazioni automatiche.
            </p>
          </section>

          {/* 3. Registrazione e Account */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              3. Registrazione e Account
            </h2>
            <p>
              Per utilizzare il Servizio è necessario creare un account fornendo informazioni veritiere,
              accurate e complete. L&apos;Utente è responsabile della riservatezza delle proprie credenziali
              di accesso e di tutte le attività svolte tramite il proprio account. In caso di accesso
              non autorizzato, l&apos;Utente è tenuto a darne immediata comunicazione al Fornitore.
              Il Fornitore si riserva il diritto di sospendere o chiudere account che violino le presenti
              condizioni.
            </p>
          </section>

          {/* 4. Piani e Pagamenti */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              4. Piani di Abbonamento e Pagamenti
            </h2>
            <p>
              Il Servizio è offerto secondo diversi piani di abbonamento (mensile o annuale) con
              funzionalità e limiti differenti. I prezzi sono indicati al netto di IVA salvo diversa
              indicazione. Il pagamento avviene tramite carta di credito, bonifico bancario o altri
              metodi di pagamento accettati. Il rinnovo dell&apos;abbonamento è automatico salvo disdetta
              comunicata almeno 30 giorni prima della scadenza. In caso di mancato pagamento, il
              Fornitore si riserva il diritto di sospendere l&apos;accesso al Servizio.
            </p>
          </section>

          {/* 5. Obblighi dell'Utente */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              5. Obblighi dell&apos;Utente
            </h2>
            <p>L&apos;Utente si impegna a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-[#636366] dark:text-[#a1a1a1]">
              <li>Utilizzare il Servizio in conformità alla normativa vigente e alle presenti condizioni</li>
              <li>Non utilizzare il Servizio per scopi illeciti, fraudolenti o lesivi dei diritti di terzi</li>
              <li>Non tentare di accedere a dati o funzionalità non autorizzate</li>
              <li>Non interferire con il funzionamento del Servizio o dei suoi sistemi di sicurezza</li>
              <li>Mantenere aggiornate le informazioni del proprio account</li>
              <li>Rispettare le leggi sulla protezione dei dati personali relativamente ai dati dei propri clienti</li>
            </ul>
          </section>

          {/* 6. Dati Personali e Privacy */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              6. Trattamento dei Dati Personali
            </h2>
            <p>
              Il trattamento dei dati personali è disciplinato dalla Privacy Policy disponibile
              sul sito. Il Fornitore agisce in qualità di Responsabile del Trattamento ai sensi
              dell&apos;art. 28 del Regolamento UE 2016/679 (GDPR) per i dati personali dei clienti
              dell&apos;Utente inseriti nella piattaforma. L&apos;Utente rimane Titolare del Trattamento
              per i dati dei propri clienti e si impegna a raccogliere i consensi necessari.
              I dati sono cifrati con algoritmo AES-256-CBC e conservati su server ubicati
              nell&apos;Unione Europea.
            </p>
          </section>

          {/* 7. Sicurezza dei Dati */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              7. Sicurezza e Protezione dei Dati
            </h2>
            <p>
              Il Fornitore adotta misure tecniche e organizzative adeguate per garantire la sicurezza
              dei dati, tra cui: crittografia dei dati in transito (TLS 1.3) e a riposo (AES-256),
              isolamento dei dati tra tenant mediante Row Level Security (RLS), backup automatici
              giornalieri, monitoraggio continuo delle infrastrutture, controllo degli accessi basato
              su ruoli. In caso di violazione dei dati (data breach), il Fornitore notificherà
              l&apos;Utente entro 72 ore dalla scoperta come previsto dal GDPR.
            </p>
          </section>

          {/* 8. Proprietà Intellettuale */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              8. Proprietà Intellettuale
            </h2>
            <p>
              Tutti i diritti di proprietà intellettuale relativi al Servizio, inclusi software,
              codice sorgente, interfacce, design, marchi e documentazione, sono e restano di
              esclusiva proprietà del Fornitore. L&apos;Utente ottiene una licenza d&apos;uso non
              esclusiva, non trasferibile e revocabile, limitata alla durata dell&apos;abbonamento.
              I dati inseriti dall&apos;Utente nella piattaforma restano di proprietà dell&apos;Utente,
              che ne mantiene tutti i diritti.
            </p>
          </section>

          {/* 9. Disponibilità del Servizio */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              9. Disponibilità del Servizio e SLA
            </h2>
            <p>
              Il Fornitore si impegna a garantire una disponibilità del Servizio pari al 99,9%
              su base mensile (escluse le manutenzioni programmate). Le manutenzioni programmate
              verranno comunicate con almeno 48 ore di anticipo. Il Fornitore non è responsabile
              per interruzioni dovute a cause di forza maggiore, malfunzionamenti di reti di
              telecomunicazione o infrastrutture di terzi.
            </p>
          </section>

          {/* 10. Limitazione di Responsabilità */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              10. Limitazione di Responsabilità
            </h2>
            <p>
              Il Fornitore non sarà responsabile per danni indiretti, incidentali, consequenziali,
              punitivi o speciali, inclusi perdita di profitti, perdita di dati, interruzione
              dell&apos;attività o danni derivanti dall&apos;uso o dall&apos;impossibilità di utilizzare
              il Servizio. La responsabilità complessiva del Fornitore, per qualsiasi causa e
              indipendentemente dalla forma dell&apos;azione, non potrà in ogni caso superare
              l&apos;importo totale corrisposto dall&apos;Utente nei 12 mesi precedenti l&apos;evento
              che ha dato origine alla pretesa.
            </p>
          </section>

          {/* 11. Garanzie */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              11. Esclusione di Garanzie
            </h2>
            <p>
              Il Servizio è fornito &ldquo;così com&apos;è&rdquo; e &ldquo;come disponibile&rdquo;.
              Il Fornitore non rilascia garanzie, esplicite o implicite, riguardo all&apos;idoneità
              del Servizio per uno scopo particolare, alla non violazione di diritti di terzi o
              all&apos;assenza di errori. L&apos;Utente riconosce che nessun software è esente da difetti
              e che l&apos;uso del Servizio avviene a proprio rischio.
            </p>
          </section>

          {/* 12. Indennizzo */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              12. Indennizzo
            </h2>
            <p>
              L&apos;Utente si impegna a manlevare e tenere indenne il Fornitore da qualsiasi pretesa,
              danno, costo o spesa (incluse le spese legali) derivanti da: (a) violazione delle
              presenti condizioni da parte dell&apos;Utente; (b) utilizzo del Servizio da parte
              dell&apos;Utente in violazione di leggi o diritti di terzi; (c) dati, contenuti o
              informazioni inseriti dall&apos;Utente nella piattaforma.
            </p>
          </section>

          {/* 13. Modifiche al Servizio */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              13. Modifiche al Servizio e alle Condizioni
            </h2>
            <p>
              Il Fornitore si riserva il diritto di modificare, aggiornare o interrompere funzionalità
              del Servizio in qualsiasi momento. Le modifiche sostanziali alle presenti Condizioni
              saranno comunicate con almeno 30 giorni di preavviso tramite email o notifica nella
              piattaforma. L&apos;utilizzo continuato del Servizio dopo la comunicazione delle modifiche
              costituisce accettazione delle nuove condizioni.
            </p>
          </section>

          {/* 14. Recesso e Risoluzione */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              14. Recesso e Risoluzione
            </h2>
            <p>
              L&apos;Utente può recedere dal contratto in qualsiasi momento dalla sezione
              &ldquo;Abbonamento&rdquo; del proprio account. Il recesso avrà effetto alla scadenza
              del periodo di fatturazione corrente. Non sono previsti rimborsi per periodi parziali.
              Il Fornitore può risolvere il contratto con effetto immediato in caso di: (a) violazione
              grave delle presenti condizioni; (b) mancato pagamento per oltre 30 giorni;
              (c) utilizzo fraudolento del Servizio. In caso di risoluzione, l&apos;Utente avrà
              30 giorni per esportare i propri dati.
            </p>
          </section>

          {/* 15. Portabilità dei Dati */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              15. Portabilità ed Esportazione dei Dati
            </h2>
            <p>
              L&apos;Utente ha il diritto di esportare i propri dati in qualsiasi momento tramite
              le funzionalità integrate nella piattaforma (export CSV, PDF, JSON). In caso di
              cessazione del rapporto contrattuale, i dati dell&apos;Utente saranno conservati per
              30 giorni e successivamente cancellati in modo irreversibile, salvo diversi obblighi
              di legge in materia di conservazione documentale e fiscale.
            </p>
          </section>

          {/* 16. Comunicazioni */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              16. Comunicazioni
            </h2>
            <p>
              Le comunicazioni tra le parti avverranno tramite email agli indirizzi indicati in fase
              di registrazione (per l&apos;Utente) e all&apos;indirizzo supporto@mechmind.io (per il Fornitore).
              Le comunicazioni relative a modifiche contrattuali, sospensione del Servizio o
              variazioni di prezzo saranno inviate con almeno 30 giorni di anticipo.
            </p>
          </section>

          {/* 17. Forza Maggiore */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              17. Forza Maggiore
            </h2>
            <p>
              Il Fornitore non sarà responsabile per inadempimenti o ritardi nell&apos;esecuzione
              delle proprie obbligazioni dovuti a cause di forza maggiore, inclusi a titolo
              esemplificativo: calamità naturali, pandemie, guerre, atti di terrorismo, interruzioni
              di energia elettrica o telecomunicazioni, provvedimenti governativi, attacchi
              informatici di portata eccezionale.
            </p>
          </section>

          {/* 18. Cessione */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              18. Cessione del Contratto
            </h2>
            <p>
              L&apos;Utente non può cedere il presente contratto o i diritti e obblighi da esso
              derivanti a terzi senza il preventivo consenso scritto del Fornitore. Il Fornitore
              può cedere il contratto a società controllate, collegate o nell&apos;ambito di
              operazioni societarie straordinarie (fusioni, acquisizioni, cessioni di ramo d&apos;azienda).
            </p>
          </section>

          {/* 19. Legge Applicabile */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              19. Legge Applicabile
            </h2>
            <p>
              Le presenti Condizioni sono regolate dalla legge italiana. Per quanto non espressamente
              previsto, si applicano le disposizioni del Codice Civile italiano, del D.Lgs. 82/2005
              (Codice dell&apos;Amministrazione Digitale), del Regolamento UE 2016/679 (GDPR) e
              delle ulteriori normative applicabili in materia di servizi digitali e protezione
              dei dati personali.
            </p>
          </section>

          {/* 20. Foro Competente */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              20. Foro Competente
            </h2>
            <p>
              Per qualsiasi controversia derivante dalle presenti Condizioni o dall&apos;utilizzo del
              Servizio, le parti si impegnano a tentare una risoluzione amichevole entro 30 giorni
              dalla contestazione. In caso di mancata conciliazione, sarà competente in via esclusiva
              il Foro di Milano, salvo quanto previsto dalle norme inderogabili a tutela del consumatore.
            </p>
          </section>

          {/* 21. Disposizioni Finali */}
          <section>
            <h2 className="text-[17px] font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              21. Disposizioni Finali
            </h2>
            <p>
              Qualora una o più disposizioni delle presenti Condizioni siano ritenute invalide o
              inefficaci, ciò non predrà la validità delle restanti disposizioni. La rinuncia da
              parte del Fornitore a far valere un proprio diritto non costituisce rinuncia a farlo
              valere in futuro. Le presenti Condizioni, unitamente alla Privacy Policy e agli
              eventuali accordi specifici sottoscritti tra le parti, costituiscono l&apos;intero
              accordo tra l&apos;Utente e il Fornitore relativamente all&apos;oggetto delle stesse.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#e0e0e0] dark:border-[#424242]">
          <p className="text-[13px] text-[#636366]">
            Per domande relative alle presenti condizioni, contattare:{' '}
            <a href="mailto:legal@mechmind.io" className="underline hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors">
              legal@mechmind.io
            </a>
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex items-center text-[14px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-70 transition-opacity"
          >
            &larr; Torna al login
          </Link>
        </div>
      </div>
    </div>
  )
}
