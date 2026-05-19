'use client';

import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

type ShopType =
  | 'meccanica'
  | 'carrozzeria'
  | 'elettrauto'
  | 'gommista'
  | 'multimarca'
  | 'concessionaria';

interface WelcomeScreenProps {
  userName: string;
  shopType: string;
  rawShopType?: ShopType | null;
  onGoToDashboard: () => void;
}

const SECTOR_SUBTITLE: Record<ShopType, string> = {
  meccanica: 'La tua Meccanica generale è stata configurata. Inizia subito.',
  carrozzeria: 'La tua Carrozzeria è stata configurata. Inizia subito.',
  elettrauto: 'Il tuo Elettrauto è stato configurato. Inizia subito.',
  gommista: 'Il tuo Gommista è stato configurato. Inizia subito.',
  multimarca: 'La tua officina Multimarca è stata configurata. Inizia subito.',
  concessionaria: 'La tua Concessionaria è stata configurata. Inizia subito.',
};

const SECTOR_NEXT_STEPS: Record<ShopType, string[]> = {
  meccanica: [
    'Crea il primo ordine di lavoro',
    'Configura il tariffario orario',
    'Importa i clienti esistenti',
  ],
  carrozzeria: [
    'Crea il primo preventivo perizia',
    'Configura le convenzioni assicurative',
    'Imposta le fasi di lavorazione',
  ],
  elettrauto: [
    'Crea il primo intervento elettrico',
    'Configura il catalogo batterie',
    'Aggiungi il primo veicolo ibrido/EV',
  ],
  gommista: [
    'Configura il deposito pneumatici',
    'Aggiungi il primo cliente stagionale',
    'Imposta le scadenze di inversione stagionale',
  ],
  multimarca: [
    'Configura le marche prevalenti',
    'Imposta il listino per marca',
    'Importa il catalogo ricambi',
  ],
  concessionaria: [
    'Aggiungi il primo veicolo in stock',
    'Configura i service plan',
    'Imposta la gestione flotte aziendali',
  ],
};

const DEFAULT_NEXT_STEPS = [
  'Aggiungi il primo cliente',
  'Configura i dati di fatturazione',
  'Imposta gli orari di apertura',
];

const btnPrimary = [
  'flex h-[52px] w-full items-center justify-center gap-2 rounded-full',
  'border border-emerald-500 text-base font-medium text-emerald-400',
  'transition-colors hover:border-emerald-400 hover:text-emerald-300',
].join(' ');

export function WelcomeScreen({
  userName,
  shopType,
  rawShopType,
  onGoToDashboard,
}: WelcomeScreenProps): React.ReactElement {
  const displayName = userName || 'il tuo account';
  const nextSteps =
    rawShopType && SECTOR_NEXT_STEPS[rawShopType]
      ? SECTOR_NEXT_STEPS[rawShopType]
      : DEFAULT_NEXT_STEPS;

  return (
    <MotionConfig reducedMotion='user'>
      <div className='flex min-h-screen w-full items-center justify-center bg-[var(--surface-tertiary)]'>
        <div className='flex w-full items-center justify-center p-4'>
          <div className='relative flex w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-elevated)] shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:max-w-[420px]'>
            <div className='flex flex-col items-stretch gap-6 px-6 py-8'>
              {/* Icon */}
              <motion.div
                className='flex justify-center'
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10'>
                  <LayoutDashboard className='h-8 w-8 text-emerald-400' />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                className='text-center'
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className='text-2xl font-normal text-[var(--text-on-brand)]'>
                  Tutto pronto{userName ? `, ${displayName}` : ''}!
                </h1>
                <p className='mt-2 text-[14px] text-[var(--text-secondary)]'>
                  {rawShopType && SECTOR_SUBTITLE[rawShopType]
                    ? SECTOR_SUBTITLE[rawShopType]
                    : 'La tua officina è stata creata. Ora puoi iniziare a usare MechMind.'}
                </p>
              </motion.div>

              {/* What's next */}
              <motion.div
                className='space-y-2'
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className='text-[13px] font-medium text-[var(--text-tertiary)]'>
                  Prossimi passi:
                </p>
                {nextSteps.map((item, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-active)] px-3 py-2.5'
                  >
                    <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500 text-[11px] text-emerald-400'>
                      {i + 1}
                    </span>
                    <span className='text-[13px] text-[var(--text-primary)]'>{item}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button type='button' onClick={onGoToDashboard} className={btnPrimary}>
                  Vai alla Dashboard
                  <ArrowRight className='h-4 w-4' />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
