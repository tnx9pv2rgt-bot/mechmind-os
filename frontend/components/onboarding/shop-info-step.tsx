'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface ShopInfoStepProps {
  shopName: string;
  shopCity: string;
  onShopNameChange: (name: string) => void;
  onShopCityChange: (city: string) => void;
}

export function ShopInfoStep({
  shopName,
  shopCity,
  onShopNameChange,
  onShopCityChange,
}: ShopInfoStepProps): React.ReactElement {
  const [nameFocused, setNameFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='flex flex-col items-center gap-6'
    >
      <div className='flex flex-col items-center gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)]/10'>
          <Building2 className='h-6 w-6 text-[var(--brand)]' />
        </div>
        <div className='text-center'>
          <h2 className='text-xl font-normal text-[var(--text-on-brand)]'>
            Informazioni dell&apos;officina
          </h2>
          <p className='mt-1 text-[13px] text-[var(--text-secondary)]'>
            Ci racconti il nome della tua officina?
          </p>
        </div>
      </div>

      <div className='w-full space-y-4'>
        {/* Nome officina */}
        <div>
          <label
            htmlFor='shop-name'
            className='block text-[13px] font-medium text-[var(--text-primary)] mb-2'
          >
            Nome dell&apos;officina
          </label>
          <motion.input
            id='shop-name'
            type='text'
            value={shopName}
            onChange={e => onShopNameChange(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder='es. Autofficina Rossi'
            autoFocus
            className={[
              'w-full px-4 py-2.5 rounded-xl border transition-all duration-200',
              'bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]',
              nameFocused
                ? 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                : 'border-[var(--border-default)]',
            ].join(' ')}
            aria-label="Nome dell'officina"
          />
        </div>

        {/* Città */}
        <div>
          <label
            htmlFor='shop-city'
            className='block text-[13px] font-medium text-[var(--text-primary)] mb-2'
          >
            Città <span className='text-[var(--text-tertiary)]'>(opzionale)</span>
          </label>
          <motion.input
            id='shop-city'
            type='text'
            value={shopCity}
            onChange={e => onShopCityChange(e.target.value)}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setCityFocused(false)}
            placeholder='es. Milano'
            className={[
              'w-full px-4 py-2.5 rounded-xl border transition-all duration-200',
              'bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]',
              cityFocused
                ? 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                : 'border-[var(--border-default)]',
            ].join(' ')}
            aria-label="Città dell'officina"
          />
        </div>
      </div>

      <div className='mt-2 text-center'>
        <p className='text-[12px] text-[var(--text-tertiary)]'>
          Potrai modificare questi dati in qualsiasi momento nelle impostazioni
        </p>
      </div>
    </motion.div>
  );
}
