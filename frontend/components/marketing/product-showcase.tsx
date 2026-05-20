'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ClipboardList,
  Camera,
  FileText,
  Package,
  Calendar,
  BarChart3,
  Shield,
  Smartphone,
} from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Ordini di Lavoro',
    description: 'Crea, assegna e monitora ogni riparazione in tempo reale. Stato aggiornato dal banco alla baia.',
    color: 'from-[var(--status-info)] to-[var(--status-info)]',
    bgLight: 'bg-[var(--status-info-subtle)]',
    bgDark: 'dark:bg-[var(--status-info)]/40/30',
    iconColor: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
  },
  {
    icon: Camera,
    title: 'Ispezioni Digitali',
    description: 'Foto, video e annotazioni direttamente dal tablet. Il cliente vede tutto in tempo reale.',
    color: 'from-[var(--status-success)] to-[var(--status-success)]',
    bgLight: 'bg-[var(--status-success)]/5',
    bgDark: 'dark:bg-[var(--status-success)]/40/30',
    iconColor: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
  },
  {
    icon: FileText,
    title: 'Fatturazione Elettronica',
    description: 'XML conforme SDI, invio automatico, gestione bollo e ritenuta. Zero errori fiscali.',
    color: 'from-[var(--brand)] to-[var(--brand)]',
    bgLight: 'bg-[var(--brand)]/5',
    bgDark: 'dark:bg-[var(--brand)]/40/30',
    iconColor: 'text-[var(--brand)] dark:text-[var(--brand)]',
  },
  {
    icon: Package,
    title: 'Gestione Ricambi',
    description: 'Inventario in tempo reale, ordini automatici, margini sempre sotto controllo.',
    color: 'from-[var(--status-warning)] to-[var(--status-warning)]',
    bgLight: 'bg-[var(--status-warning-subtle)]',
    bgDark: 'dark:bg-[var(--status-warning)]/40/30',
    iconColor: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
  },
  {
    icon: Calendar,
    title: 'Prenotazione Online',
    description: 'I clienti prenotano 24/7. Conferma automatica, promemoria SMS, zero telefonate perse.',
    color: 'from-[var(--status-error)] to-[var(--status-error)]',
    bgLight: 'bg-[var(--status-error)]/5',
    bgDark: 'dark:bg-[var(--status-error)]/40/30',
    iconColor: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
  },
  {
    icon: BarChart3,
    title: 'Analytics e Report',
    description: 'KPI in tempo reale: fatturato, margini, produttività tecnici, ticket medio.',
    color: 'from-[var(--status-info)] to-[var(--status-info)]',
    bgLight: 'bg-[var(--status-info)]/5',
    bgDark: 'dark:bg-[var(--status-info)]/40/30',
    iconColor: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
  },
  {
    icon: Shield,
    title: 'GDPR e Sicurezza',
    description: 'Crittografia AES-256, isolamento dati per sede, backup automatici, audit trail completo.',
    color: 'from-[var(--surface-secondary)]0 to-[var(--surface-active)]',
    bgLight: 'bg-[var(--surface-secondary)]',
    bgDark: 'dark:bg-[var(--surface-primary)]/30',
    iconColor: 'text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]',
  },
  {
    icon: Smartphone,
    title: 'Portale Clienti',
    description: 'I tuoi clienti vedono stato riparazione, storico, fatture e prenotano online. Tutto brandizzato.',
    color: 'from-[var(--status-warning)] to-[var(--status-warning)]',
    bgLight: 'bg-[var(--status-warning)]/5',
    bgDark: 'dark:bg-[var(--status-warning)]/40/30',
    iconColor: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function ProductShowcase(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="prodotto" className="py-20 lg:py-32 bg-[var(--surface-secondary)] dark:bg-[var(--surface-tertiary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-sm font-semibold uppercase tracking-wider text-[var(--brand)] mb-4">
            Prodotto
          </span>
          <h2 className="text-title-1 text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
            Ogni strumento di cui hai bisogno.
            <br className="hidden sm:block" />
            In un&apos;unica piattaforma.
          </h2>
          <p className="text-lg text-[var(--text-tertiary)] dark:text-[var(--text-tertiary)] max-w-2xl mx-auto">
            Otto moduli integrati che lavorano insieme. Niente più software scollegati,
            fogli Excel o quaderni. Solo efficienza.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className={`group relative p-6 rounded-2xl ${feature.bgLight} ${feature.bgDark} border border-transparent hover:border-[var(--border-default)] dark:hover:border-[var(--border-strong)] transition-all duration-300 hover:shadow-lg cursor-default`}
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <Icon className="h-6 w-6 text-[var(--text-on-brand)]" />
                </div>

                {/* Content */}
                <h3 className="text-[17px] font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                  {feature.description}
                </p>

                {/* Hover accent line */}
                <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${feature.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-[var(--text-tertiary)] dark:text-[var(--text-tertiary)] mb-6">
            E molto altro: garanzie, flotte, OBD diagnostica, multi-sede, campagne marketing...
          </p>
          <a
            href="#funzionalita"
            className="inline-flex items-center gap-2 text-[var(--brand)] font-medium hover:underline transition-colors"
          >
            Scopri tutte le funzionalità
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
