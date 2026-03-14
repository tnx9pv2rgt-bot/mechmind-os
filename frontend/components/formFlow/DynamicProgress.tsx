'use client';

/**
 * DynamicProgress Component
 * 
 * Barra di progresso dinamica con:
 * - Indicatore di step corrente
 * - Tempo stimato rimanente
 * - Indicatori visivi per ogni step
 * - Animazioni fluide
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicProgressProps } from '@/lib/formFlow/types';
import { formatEstimatedTime } from '@/lib/formFlow/utils';

/**
 * DynamicProgress
 */
export const DynamicProgress: React.FC<DynamicProgressProps> = ({
  current,
  total,
  estimatedTime,
  className,
  showStepIndicators = true,
  showTimeEstimate = true,
}) => {
  // Calcola percentuale
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  // Determina stato per ogni step
  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (index < current - 1) return 'completed';
    if (index === current - 1) return 'current';
    return 'pending';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header con info */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            Domanda {current} di {total}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">
            {Math.round(percentage)}% completato
          </span>
        </div>
        
        {showTimeEstimate && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{formatEstimatedTime(estimatedTime)} rimanenti</span>
          </div>
        )}
      </div>

      {/* Progress bar principale */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            mass: 1,
          }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '500%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Step indicators */}
      {showStepIndicators && total <= 10 && (
        <div className="flex gap-1 mt-3">
          {Array.from({ length: total }).map((_, index) => {
            const status = getStepStatus(index);
            
            return (
              <motion.div
                key={index}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  status === 'completed' && 'bg-blue-500',
                  status === 'current' && 'bg-blue-300',
                  status === 'pending' && 'bg-gray-200'
                )}
                initial={false}
                animate={{
                  scale: status === 'current' ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 0.5,
                  repeat: status === 'current' ? Infinity : 0,
                  repeatDelay: 1,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Step dots (per molti step) */}
      {showStepIndicators && total > 10 && (
        <div className="flex justify-between items-center mt-3 px-1">
          {Array.from({ length: Math.min(total, 20) }).map((_, index) => {
            const stepIndex = Math.floor((index / 19) * (total - 1));
            const status = getStepStatus(stepIndex);
            
            return (
              <motion.div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-300',
                  status === 'completed' && 'bg-blue-500',
                  status === 'current' && 'bg-blue-400 ring-2 ring-blue-200',
                  status === 'pending' && 'bg-gray-200'
                )}
                whileHover={{ scale: 1.5 }}
              />
            );
          })}
        </div>
      )}

      {/* Legend step attuale */}
      <motion.div
        className="flex justify-center mt-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        key={current}
      >
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
          <Loader2 className="w-3 h-3 animate-spin" />
          Step {current} di {total}
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Compact version per spazi ridotti
 */
export const CompactProgress: React.FC<
  Omit<DynamicProgressProps, 'showStepIndicators'>
> = ({ current, total, estimatedTime, className, showTimeEstimate = true }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Circular progress */}
      <div className="relative w-10 h-10">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-200"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <motion.path
            className="text-blue-500"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            initial={{ strokeDasharray: '0, 100' }}
            animate={{ strokeDasharray: `${percentage}, 100` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
          {current}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          Step {current} di {total}
        </span>
        {showTimeEstimate && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatEstimatedTime(estimatedTime)} rimanenti
          </span>
        )}
      </div>
    </div>
  );
};

export default DynamicProgress;
