'use client';

import { motion } from 'framer-motion';
import { Wrench, Paintbrush, Zap, CircleDot, Car, Building2 } from 'lucide-react';

interface ShopTypeStepProps {
  selected: string | null;
  onSelect: (type: string) => void;
}

interface ShopTypeOption {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
}

const SHOP_TYPES: ShopTypeOption[] = [
  { id: 'meccanica_generale', icon: <Wrench className="h-6 w-6" />, name: 'Meccanica generale', description: 'Riparazioni e manutenzione ordinaria' },
  { id: 'carrozzeria', icon: <Paintbrush className="h-6 w-6" />, name: 'Carrozzeria', description: 'Riparazioni carrozzeria e verniciatura' },
  { id: 'elettrauto', icon: <Zap className="h-6 w-6" />, name: 'Elettrauto', description: 'Impianti elettrici e diagnostica' },
  { id: 'gommista', icon: <CircleDot className="h-6 w-6" />, name: 'Gommista', description: 'Pneumatici e convergenza' },
  { id: 'multimarca', icon: <Car className="h-6 w-6" />, name: 'Multimarca', description: 'Assistenza su tutte le marche' },
  { id: 'concessionaria', icon: <Building2 className="h-6 w-6" />, name: 'Concessionaria', description: 'Vendita e assistenza autorizzata' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
};

export function ShopTypeStep({ selected, onSelect }: ShopTypeStepProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-xl font-normal text-white">Che tipo di officina hai?</h2>
        <p className="mt-1 text-[13px] text-[#b4b4b4]">Personalizzeremo l&apos;esperienza per te</p>
      </div>

      <motion.div
        className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {SHOP_TYPES.map((type) => {
          const isSelected = selected === type.id;
          return (
            <motion.button
              key={type.id}
              type="button"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(type.id)}
              className={[
                'relative flex min-h-[90px] flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200',
                isSelected
                  ? 'border-white/60 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                  : 'border-[#444] bg-[#3a3a3a] hover:border-[#666] hover:bg-[#404040]',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <motion.div
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#1d1d1f" className="h-2.5 w-2.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
              <span className={isSelected ? 'text-white' : 'text-[#999]'}>{type.icon}</span>
              <span className={['text-[13px] font-medium', isSelected ? 'text-white' : 'text-[#ccc]'].join(' ')}>
                {type.name}
              </span>
              <span className="text-[11px] text-[#888]">{type.description}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
