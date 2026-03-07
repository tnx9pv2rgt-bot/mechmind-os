/**
 * CustomerTypeStep Component
 * 
 * Step per la selezione del tipo di cliente (private/business).
 * Questo step determina il branching del form.
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Building2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerTypeStepProps {
  stepId: string;
  answers: { customerType?: 'private' | 'business' };
  onAnswersChange: (answers: { customerType: 'private' | 'business' }) => void;
  onNext: () => void;
  className?: string;
}

const options = [
  {
    id: 'private' as const,
    title: 'Privato',
    description: 'Account personale per uso individuale',
    icon: User,
    features: ['Gestione personale', 'Fatturazione semplificata', 'Supporto email'],
    color: 'blue',
  },
  {
    id: 'business' as const,
    title: 'Azienda',
    description: 'Account business per team e organizzazioni',
    icon: Building2,
    features: ['Multi-utente', 'Fatturazione avanzata', 'Supporto prioritario'],
    color: 'purple',
  },
];

export const CustomerTypeStep: React.FC<CustomerTypeStepProps> = ({
  stepId,
  answers,
  onAnswersChange,
  onNext,
  className,
}) => {
  const [selected, setSelected] = useState<'private' | 'business' | null>(
    answers.customerType || null
  );

  const handleSelect = (type: 'private' | 'business') => {
    setSelected(type);
    onAnswersChange({ customerType: type });
  };

  return (
    <motion.div
      className={cn('py-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Che tipo di account ti serve?
        </h2>
        <p className="text-gray-600">
          Seleziona l&apos;opzione più adatta alle tue esigenze
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {options.map((option, index) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={cn(
                'relative p-6 rounded-2xl border-2 text-left transition-all duration-200',
                'focus:outline-none focus:ring-4',
                isSelected
                  ? option.id === 'private'
                    ? 'border-blue-500 bg-blue-50 ring-blue-200'
                    : 'border-purple-500 bg-purple-50 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  className={cn(
                    'absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center',
                    option.id === 'private' ? 'bg-blue-500' : 'bg-purple-500'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                  isSelected
                    ? option.id === 'private'
                      ? 'bg-blue-500 text-white'
                      : 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{option.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{option.description}</p>

              {/* Features */}
              <ul className="space-y-2">
                {option.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className={cn(
                        'w-4 h-4',
                        option.id === 'private' ? 'text-blue-500' : 'text-purple-500'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {/* Custom CTA when selected */}
      {selected && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={onNext}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white shadow-lg transition-all',
              selected === 'private'
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                : 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-200'
            )}
          >
            Continua come {selected === 'private' ? 'Privato' : 'Azienda'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CustomerTypeStep;
