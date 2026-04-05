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
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Camera,
    title: 'Ispezioni Digitali',
    description: 'Foto, video e annotazioni direttamente dal tablet. Il cliente vede tutto in tempo reale.',
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: FileText,
    title: 'Fatturazione Elettronica',
    description: 'XML conforme SDI, invio automatico, gestione bollo e ritenuta. Zero errori fiscali.',
    color: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    bgDark: 'dark:bg-violet-950/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: Package,
    title: 'Gestione Ricambi',
    description: 'Inventario in tempo reale, ordini automatici, margini sempre sotto controllo.',
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: Calendar,
    title: 'Prenotazione Online',
    description: 'I clienti prenotano 24/7. Conferma automatica, promemoria SMS, zero telefonate perse.',
    color: 'from-rose-500 to-rose-600',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-950/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    icon: BarChart3,
    title: 'Analytics e Report',
    description: 'KPI in tempo reale: fatturato, margini, produttività tecnici, ticket medio.',
    color: 'from-cyan-500 to-cyan-600',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-950/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    icon: Shield,
    title: 'GDPR e Sicurezza',
    description: 'Crittografia AES-256, isolamento dati per sede, backup automatici, audit trail completo.',
    color: 'from-slate-500 to-slate-600',
    bgLight: 'bg-slate-50',
    bgDark: 'dark:bg-slate-950/30',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
  {
    icon: Smartphone,
    title: 'Portale Clienti',
    description: 'I tuoi clienti vedono stato riparazione, storico, fatture e prenotano online. Tutto brandizzato.',
    color: 'from-pink-500 to-pink-600',
    bgLight: 'bg-pink-50',
    bgDark: 'dark:bg-pink-950/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
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
    <section id="prodotto" className="py-20 lg:py-32 bg-white dark:bg-[var(--surface-tertiary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-sm font-semibold uppercase tracking-wider text-apple-blue mb-4">
            Prodotto
          </span>
          <h2 className="text-title-1 text-neutral-900 dark:text-neutral-100 mb-4">
            Ogni strumento di cui hai bisogno.
            <br className="hidden sm:block" />
            In un&apos;unica piattaforma.
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
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
                className={`group relative p-6 rounded-2xl ${feature.bgLight} ${feature.bgDark} border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-300 hover:shadow-lg cursor-default`}
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
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
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            E molto altro: garanzie, flotte, OBD diagnostica, multi-sede, campagne marketing...
          </p>
          <a
            href="#funzionalita"
            className="inline-flex items-center gap-2 text-apple-blue font-medium hover:underline transition-colors"
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
