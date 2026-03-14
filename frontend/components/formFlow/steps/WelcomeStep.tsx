'use client';

/**
 * WelcomeStep Component
 * 
 * Step di benvenuto con animazione e introduzione al form.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStepProps {
  stepId: string;
  onNext: () => void;
  className?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  stepId,
  onNext,
  className,
}) => {
  return (
    <motion.div
      className={cn('flex flex-col items-center text-center py-8', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Icona animata */}
      <motion.div
        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>

      {/* Titolo */}
      <motion.h1
        className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Benvenuto! 👋
      </motion.h1>

      {/* Descrizione */}
      <motion.p
        className="text-lg text-gray-600 max-w-md mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Ti guideremo nella configurazione del tuo account in pochi semplici passaggi.
        Il processo durerà circa 5 minuti.
      </motion.p>

      {/* Features */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 w-full max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[
          { label: 'Semplice', desc: '3-5 minuti' },
          { label: 'Sicuro', desc: 'Dati protetti' },
          { label: 'Veloce', desc: 'Attivazione immediata' },
        ].map((feature, index) => (
          <motion.div
            key={feature.label}
            className="p-4 bg-gray-50 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <div className="text-sm font-semibold text-gray-900">{feature.label}</div>
            <div className="text-xs text-gray-500">{feature.desc}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.button
        type="button"
        onClick={onNext}
        className="group flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        Inizia ora
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
};

export default WelcomeStep;
