'use client';

import { motion } from 'framer-motion';
import type { ShopType, SectorAnswers } from '@/stores/onboarding-store';

interface Question {
  key: string;
  text: string;
  type: 'yesno' | 'choice';
  options?: string[];
}

const SECTOR_QUESTIONS: Record<ShopType, Question[]> = {
  meccanica: [
    { key: 'hasWarranty', text: 'Effettuate riparazioni in garanzia?', type: 'yesno' },
    { key: 'hasOBD', text: 'Usate software di diagnostica OBD?', type: 'yesno' },
  ],
  carrozzeria: [
    { key: 'hasInsurance', text: 'Siete convenzionati con assicurazioni?', type: 'yesno' },
    { key: 'hasEstimator', text: 'Usate estimatori esterni (es. Audatex)?', type: 'yesno' },
  ],
  elettrauto: [
    { key: 'hasEV', text: 'Lavorate su veicoli ibridi o elettrici?', type: 'yesno' },
    { key: 'hasBatteryDiag', text: 'Effettuate diagnosi batterie e alternatori?', type: 'yesno' },
  ],
  gommista: [
    { key: 'hasDeposit', text: 'Offrite servizio di deposito pneumatici?', type: 'yesno' },
    { key: 'hasAlignment', text: 'Effettuate convergenza e assetto?', type: 'yesno' },
  ],
  multimarca: [
    { key: 'hasOEMSoftware', text: 'Avete software di diagnostica OEM?', type: 'yesno' },
    {
      key: 'brandCount',
      text: 'Quante marche trattate prevalentemente?',
      type: 'choice',
      options: ['1 marca', '2–3 marche', '4 o più'],
    },
  ],
  concessionaria: [
    {
      key: 'vehicleStock',
      text: 'Trattate veicoli nuovi, usati o entrambi?',
      type: 'choice',
      options: ['Solo nuovi', 'Solo usati', 'Entrambi'],
    },
    { key: 'hasFleet', text: 'Gestite flotte aziendali?', type: 'yesno' },
  ],
};

const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  meccanica: 'Meccanica generale',
  carrozzeria: 'Carrozzeria',
  elettrauto: 'Elettrauto',
  gommista: 'Gommista',
  multimarca: 'Multimarca',
  concessionaria: 'Concessionaria',
};

interface SectorQuestionsStepProps {
  shopType: ShopType | null;
  answers: SectorAnswers;
  onAnswer: (key: string, value: string) => void;
}

export function SectorQuestionsStep({
  shopType,
  answers,
  onAnswer,
}: SectorQuestionsStepProps): React.ReactElement {
  if (!shopType) {
    return (
      <div className='flex items-center justify-center py-12 text-[var(--text-tertiary)] text-sm'>
        Seleziona prima il tipo di officina.
      </div>
    );
  }

  const questions = SECTOR_QUESTIONS[shopType];
  const label = SHOP_TYPE_LABELS[shopType];

  return (
    <div className='flex flex-col gap-6'>
      <div className='text-center'>
        <h2 className='text-[18px] font-normal text-[var(--text-on-brand)]'>
          Qualche dettaglio in più
        </h2>
        <p className='mt-1 text-[13px] text-[var(--text-tertiary)]'>
          Domande specifiche per <span className='text-[var(--text-secondary)]'>{label}</span>
        </p>
      </div>

      <div className='flex flex-col gap-4'>
        {questions.map((q, i) => (
          <motion.div
            key={q.key}
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            transition={{ delay: i * 0.08 }}
            className='flex flex-col gap-2'
          >
            <p className='text-[14px] font-medium text-[var(--text-on-brand)]'>{q.text}</p>

            {q.type === 'yesno' ? (
              <div className='flex gap-2'>
                {(['Sì', 'No'] as const).map(opt => {
                  const val = opt === 'Sì' ? 'si' : 'no';
                  const selected = answers[q.key] === val;
                  return (
                    <button
                      key={opt}
                      type='button'
                      onClick={() => onAnswer(q.key, val)}
                      aria-pressed={selected}
                      className={[
                        'flex h-[48px] flex-1 items-center justify-center rounded-xl text-[14px] font-medium transition-all duration-200',
                        selected
                          ? 'border border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-on-brand)]',
                      ].join(' ')}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {q.options?.map(opt => {
                  const selected = answers[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type='button'
                      onClick={() => onAnswer(q.key, opt)}
                      aria-pressed={selected}
                      className={[
                        'flex h-[48px] items-center justify-center rounded-xl px-4 text-[14px] font-medium transition-all duration-200',
                        selected
                          ? 'border border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-on-brand)]',
                      ].join(' ')}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <p className='text-center text-[12px] text-[var(--text-tertiary)]'>
        Opzionali — puoi rispondere nelle impostazioni in seguito.
      </p>
    </div>
  );
}
