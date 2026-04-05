'use client';

import { motion } from 'framer-motion';
import { FileText, Table, RefreshCw } from 'lucide-react';

interface MigrationStepProps {
  selected: string | null;
  onSelect: (source: string) => void;
}

interface MigrationOption {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
}

const MIGRATION_OPTIONS: MigrationOption[] = [
  { id: 'da_zero', icon: <FileText className="h-5 w-5" />, name: 'Parto da zero', description: 'Prima volta con un gestionale' },
  { id: 'excel_carta', icon: <Table className="h-5 w-5" />, name: 'Excel / Carta', description: 'Ho dati da importare' },
  { id: 'altro_gestionale', icon: <RefreshCw className="h-5 w-5" />, name: 'Altro gestionale', description: 'Migro da un altro software' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } },
};

export function MigrationStep({ selected, onSelect }: MigrationStepProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-xl font-normal text-white">Da dove parti?</h2>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Ti aiuteremo a iniziare nel modo giusto</p>
      </div>

      <motion.div
        className="flex w-full flex-col gap-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {MIGRATION_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <motion.button
              key={option.id}
              type="button"
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(option.id)}
              className={[
                'relative flex min-h-[64px] items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-white/60 bg-white/10'
                  : 'border-[var(--border-default)] bg-[var(--surface-active)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-active)]',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <motion.div
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#1d1d1f" className="h-2.5 w-2.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
              <span className={isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}>{option.icon}</span>
              <div>
                <span className={['text-[14px] font-medium', isSelected ? 'text-white' : 'text-[var(--text-primary)]'].join(' ')}>
                  {option.name}
                </span>
                <p className="text-[12px] text-[var(--text-tertiary)]">{option.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
