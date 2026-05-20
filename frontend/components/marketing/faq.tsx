'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';


const faqItems = [
  {
    question: 'Devo installare qualcosa?',
    answer:
      'No. MechMind funziona nel browser. Basta un tablet o un computer con connessione internet.',
  },
  {
    question: 'Funziona con la fatturazione elettronica SDI?',
    answer:
      'Sì. SDI, PEC, Codice Fiscale, Partita IVA — tutto integrato nativamente. Non devi usare un altro software.',
  },
  {
    question: 'Posso importare i miei clienti da Excel?',
    answer:
      "Sì. L'import CSV è guidato: carichi il file, mappi le colonne, e in 2 minuti hai tutti i tuoi clienti dentro.",
  },
  {
    question: 'I miei dati sono al sicuro?',
    answer:
      'Crittografia AES-256, GDPR compliant, backup giornalieri, server in Europa. I tuoi dati sono tuoi, sempre.',
  },
  {
    question: 'Quanto costa?',
    answer:
      'Da €29/mese. 14 giorni gratis senza carta di credito. Puoi annullare quando vuoi.',
  },
  {
    question: 'Posso usarlo dal tablet in officina?',
    answer:
      'Assolutamente. MechMind è responsive e ottimizzato per tablet con touch target di almeno 44px.',
  },
] as const;

function FaqItem({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof faqItems)[number];
  isOpen: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <div className="border-b border-[var(--border-default)] last:border-0 dark:border-[var(--border-default)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center justify-between py-5 text-left transition-colors hover:text-[var(--text-primary)] dark:hover:text-[var(--text-on-brand)]"
        aria-expanded={isOpen}
      >
        <span className="pr-4 text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <span className="h-5 w-5 text-[var(--text-secondary)] inline-flex items-center justify-center text-base">▾</span>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq(): React.ReactElement {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="faq" ref={ref} className="bg-[var(--surface-secondary)] py-20 dark:bg-[var(--surface-secondary)] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-4xl">
            Domande frequenti
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          className="mx-auto mt-12 max-w-3xl rounded-2xl bg-[var(--surface-secondary)] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[var(--surface-elevated)] sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {faqItems.map((item, i) => (
            <FaqItem
              key={item.question}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
