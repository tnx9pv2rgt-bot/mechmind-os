'use client';

import { useState, useRef, type ReactNode } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Users, RefreshCw, ArrowRightLeft, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type BillingPeriod = 'monthly' | 'annual';

interface PlanFeature {
  label: string;
}

interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  features: PlanFeature[];
  cta: string;
  highlighted: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

const PLANS: PricingPlan[] = [
  {
    id: 'start',
    name: 'Start',
    tagline: 'Per chi inizia',
    monthlyPrice: 99,
    annualPrice: 79,
    features: [
      { label: 'Ordini di lavoro' },
      { label: 'Fatturazione base' },
      { label: 'CRM clienti' },
      { label: '1 sede' },
      { label: 'Supporto email' },
    ],
    cta: 'Inizia gratis',
    highlighted: false,
  },
  {
    id: 'grow',
    name: 'Grow',
    tagline: 'Per officine in crescita',
    monthlyPrice: 199,
    annualPrice: 159,
    features: [
      { label: 'Tutto di Start +' },
      { label: 'Ispezioni digitali (DVI)' },
      { label: 'Gestione ricambi' },
      { label: 'Preventivi' },
      { label: 'Marketing base' },
      { label: 'Supporto prioritario' },
    ],
    cta: 'Inizia gratis',
    highlighted: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'Per multi-sede',
    monthlyPrice: 349,
    annualPrice: 279,
    features: [
      { label: 'Tutto di Grow +' },
      { label: 'Multi-sede' },
      { label: 'Analytics avanzati' },
      { label: 'Portale clienti' },
      { label: 'API access' },
      { label: 'Account manager dedicato' },
    ],
    cta: 'Inizia gratis',
    highlighted: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Soluzioni su misura',
    monthlyPrice: null,
    annualPrice: null,
    features: [
      { label: 'Tutto di Scale +' },
      { label: 'Sedi illimitate' },
      { label: 'SLA garantito' },
      { label: 'Integrazioni custom' },
      { label: 'Formazione on-site' },
      { label: 'Supporto 24/7' },
    ],
    cta: 'Contattaci',
    highlighted: false,
  },
];

const INCLUDED_PERKS: { icon: typeof Users; label: string }[] = [
  { icon: Users, label: 'Utenti illimitati' },
  { icon: RefreshCw, label: 'Aggiornamenti gratuiti' },
  { icon: ArrowRightLeft, label: 'Migrazione assistita' },
  { icon: ShieldOff, label: 'Nessun contratto' },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Posso cambiare piano in qualsiasi momento?',
    answer:
      'Certo. Puoi passare a un piano superiore o inferiore in qualsiasi momento dalla dashboard. L\'upgrade ha effetto immediato, il downgrade dal prossimo ciclo di fatturazione. Non perdi mai i dati.',
  },
  {
    question: 'C\'e un periodo di prova gratuito?',
    answer:
      'Tutti i piani includono 14 giorni di prova gratuita senza carta di credito. Potrai esplorare tutte le funzionalita del piano scelto e, al termine della prova, decidere se continuare.',
  },
  {
    question: 'Come funziona la fatturazione?',
    answer:
      'La fatturazione avviene tramite Stripe. Puoi pagare con carta di credito, debito o SEPA. Ricevi fattura elettronica conforme alla normativa italiana (FatturaPA) direttamente via SDI.',
  },
  {
    question: 'Offrite sconti per piu sedi?',
    answer:
      'Il piano Scale include fino a 5 sedi. Per piu sedi, il piano Enterprise offre prezzi personalizzati con sconti volume. Contattaci per un preventivo su misura.',
  },
  {
    question: 'Cosa succede se cancello l\'abbonamento?',
    answer:
      'Puoi cancellare in qualsiasi momento. Mantieni l\'accesso fino alla fine del periodo pagato. I tuoi dati restano disponibili per l\'export per 90 giorni dalla cancellazione, in conformita GDPR.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Animation Variants                                                         */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={cn(
          'text-body font-medium transition-colors duration-apple',
          period === 'monthly' ? 'text-apple-dark dark:text-white' : 'text-apple-gray'
        )}
      >
        Mensile
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={period === 'annual'}
        aria-label="Passa alla fatturazione annuale"
        onClick={() => onChange(period === 'monthly' ? 'annual' : 'monthly')}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-apple ease-apple',
          period === 'annual' ? 'bg-apple-blue' : 'bg-apple-border dark:bg-neutral-600'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-6 w-6 rounded-full bg-white shadow-apple',
            'transition-transform duration-apple ease-apple',
            period === 'annual' ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>

      <span
        className={cn(
          'text-body font-medium transition-colors duration-apple',
          period === 'annual' ? 'text-apple-dark dark:text-white' : 'text-apple-gray'
        )}
      >
        Annuale
      </span>

      <span
        className={cn(
          'ml-2 inline-flex items-center rounded-full px-3 py-1 text-footnote font-semibold',
          'bg-apple-green/10 text-apple-green',
          'transition-opacity duration-apple',
          period === 'annual' ? 'opacity-100' : 'opacity-0'
        )}
      >
        Risparmi il 20%
      </span>
    </div>
  );
}

function PriceDisplay({
  plan,
  period,
}: {
  plan: PricingPlan;
  period: BillingPeriod;
}): ReactNode {
  if (plan.monthlyPrice === null) {
    return (
      <div className="mb-6">
        <span className="text-title-1 font-bold text-apple-dark dark:text-white">Contattaci</span>
      </div>
    );
  }

  const currentPrice = period === 'annual' ? plan.annualPrice! : plan.monthlyPrice;
  const showStrikethrough = period === 'annual';

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-[40px] font-bold leading-none tracking-tight text-apple-dark dark:text-white">
          {'\u20AC'}{currentPrice}
        </span>
        <span className="text-callout text-apple-gray">/mese</span>
      </div>
      {showStrikethrough && (
        <p className="mt-1 text-footnote text-apple-gray">
          <span className="line-through">{'\u20AC'}{plan.monthlyPrice}/mese</span>
          {' '}fatturato annualmente
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  period,
}: {
  plan: PricingPlan;
  period: BillingPeriod;
}): ReactNode {
  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        'relative flex flex-col rounded-2xl p-8',
        'bg-white dark:bg-neutral-800',
        'shadow-apple transition-shadow duration-apple ease-apple hover:shadow-apple-lg',
        plan.highlighted && 'z-10 border-2 border-apple-blue lg:scale-105',
        !plan.highlighted && 'border border-apple-border dark:border-neutral-700'
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-apple-blue px-4 py-1.5 text-footnote font-semibold text-white shadow-apple">
            Piu popolare
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-title-2 font-bold text-apple-dark dark:text-white">{plan.name}</h3>
        <p className="mt-1 text-callout text-apple-gray">{plan.tagline}</p>
      </div>

      <PriceDisplay plan={plan} period={period} />

      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-apple-green" strokeWidth={2.5} />
            <span className="text-callout text-apple-dark dark:text-neutral-200">
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <a
        href={plan.id === 'enterprise' ? '#contatti' : '#prova-gratuita'}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-6 py-3',
          'text-callout font-semibold transition-all duration-apple ease-apple',
          'min-h-[44px]',
          plan.highlighted
            ? 'bg-apple-blue text-white hover:bg-apple-blue-hover hover:shadow-apple'
            : 'border border-apple-border bg-white text-apple-blue hover:bg-apple-light-gray dark:border-neutral-600 dark:bg-neutral-700 dark:text-apple-blue dark:hover:bg-neutral-600'
        )}
      >
        {plan.cta}
      </a>
    </motion.div>
  );
}

function FaqAccordionItem({ item }: { item: FaqItem }): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-apple-border dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between py-5 text-left',
          'min-h-[44px] transition-colors duration-apple ease-apple',
          'hover:text-apple-blue'
        )}
        aria-expanded={open}
      >
        <span className="text-body font-medium text-apple-dark dark:text-white">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="ml-4 shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-apple-gray" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-callout leading-relaxed text-apple-gray">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export function Pricing(): ReactNode {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      id="prezzi"
      ref={sectionRef}
      className="relative overflow-hidden bg-apple-light-gray py-24 dark:bg-neutral-900 sm:py-32"
    >
      <div className="mx-auto max-w-apple-wide px-6 lg:px-8">
        {/* ---- Header ---- */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mx-auto max-w-apple-narrow text-center"
        >
          <h2 className="text-headline font-bold tracking-tight text-apple-dark dark:text-white">
            Prezzi semplici e trasparenti
          </h2>
          <p className="mt-4 text-body-large text-apple-gray">
            Utenti illimitati. Ordini illimitati. Nessun costo nascosto.
          </p>

          <div className="mt-10">
            <BillingToggle period={billingPeriod} onChange={setBillingPeriod} />
          </div>
        </motion.div>

        {/* ---- Pricing Cards ---- */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
          className="mx-auto mt-16 grid max-w-apple-wide grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} period={billingPeriod} />
          ))}
        </motion.div>

        {/* ---- Included Perks ---- */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mx-auto mt-16 max-w-apple grid grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {INCLUDED_PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.label} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-apple-blue/10">
                  <Icon className="h-5 w-5 text-apple-blue" />
                </div>
                <span className="text-subhead font-medium text-apple-dark dark:text-neutral-200">
                  {perk.label}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* ---- FAQ ---- */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mx-auto mt-24 max-w-apple-narrow"
        >
          <h3 className="mb-8 text-center text-title-1 font-bold text-apple-dark dark:text-white">
            Domande frequenti
          </h3>
          <div className="rounded-2xl bg-white p-6 shadow-apple dark:bg-neutral-800 sm:p-8">
            {FAQ_ITEMS.map((item) => (
              <FaqAccordionItem key={item.question} item={item} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Pricing;
