'use client';

import { motion } from 'framer-motion';
import { User, Users, UsersRound } from 'lucide-react';

interface TeamSizeStepProps {
  selected: string | null;
  onSelect: (size: string) => void;
}

interface TeamSizeOption {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
}

const TEAM_SIZES: TeamSizeOption[] = [
  { id: 'solo', icon: <User className="h-5 w-5" />, name: 'Solo io', description: 'Gestisco tutto da solo' },
  { id: '2-5', icon: <Users className="h-5 w-5" />, name: '2-5 persone', description: 'Piccolo team' },
  { id: '6+', icon: <UsersRound className="h-5 w-5" />, name: '6+ persone', description: 'Team strutturato' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } },
};

export function TeamSizeStep({ selected, onSelect }: TeamSizeStepProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-xl font-normal text-white">Quanto è grande il tuo team?</h2>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Adatteremo funzionalità e permessi</p>
      </div>

      <motion.div
        className="flex w-full flex-col gap-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {TEAM_SIZES.map((size) => {
          const isSelected = selected === size.id;
          return (
            <motion.button
              key={size.id}
              type="button"
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(size.id)}
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
              <span className={isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}>{size.icon}</span>
              <div>
                <span className={['text-[14px] font-medium', isSelected ? 'text-white' : 'text-[var(--text-primary)]'].join(' ')}>
                  {size.name}
                </span>
                <p className="text-[12px] text-[var(--text-tertiary)]">{size.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
