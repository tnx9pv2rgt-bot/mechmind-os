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
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">
            Domanda {current} di {total}
          </span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-[var(--text-tertiary)]">
            {Math.round(percentage)}% completato
          </span>
        </div>
        
        {showTimeEstimate && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)]">
            <Clock className="w-4 h-4" />
            <span>{formatEstimatedTime(estimatedTime)} rimanenti</span>
          </div>
        )}
      </div>

      {/* Progress bar principale */}
      <div className="relative h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--status-info)] to-[var(--status-info)] rounded-full"
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
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-[var(--surface-secondary)]/30 to-transparent"
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
                  status === 'completed' && 'bg-[var(--status-info)]',
                  status === 'current' && 'bg-[var(--status-info)]',
                  status === 'pending' && 'bg-[var(--border-default)]'
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
                  status === 'completed' && 'bg-[var(--status-info)]',
                  status === 'current' && 'bg-[var(--status-info)] ring-2 ring-[var(--status-info)]/20',
                  status === 'pending' && 'bg-[var(--border-default)]'
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
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--status-info-subtle)] text-[var(--status-info)] rounded-full text-xs font-medium">
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
            className="text-[var(--text-tertiary)]"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <motion.path
            className="text-[var(--status-info)]"
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
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
          {current}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Step {current} di {total}
        </span>
        {showTimeEstimate && (
          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatEstimatedTime(estimatedTime)} rimanenti
          </span>
        )}
      </div>
    </div>
  );
};

export default DynamicProgress;
