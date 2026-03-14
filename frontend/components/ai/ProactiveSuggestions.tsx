'use client';

/**
 * Proactive Suggestions Component
 * UI per visualizzare i suggerimenti AI proattivi in stile GitHub Copilot
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, AlertCircle, Lightbulb, Sparkles, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type Suggestion, type SuggestionType } from '@/lib/ai/proactiveSuggestions';

export interface ProactiveSuggestionsProps {
  suggestions: Suggestion[];
  onDismiss: (id: string) => void;
  maxSuggestions?: number;
  className?: string;
}

/**
 * Mappa dei colori per tipo di suggestion
 */
const typeStyles: Record<SuggestionType, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  progressColor: string;
}> = {
  autofill: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    progressColor: 'bg-blue-500',
  },
  correction: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
    iconColor: 'text-amber-600 dark:text-amber-400',
    progressColor: 'bg-amber-500',
  },
  tip: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    progressColor: 'bg-gray-500',
  },
  optimization: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
    progressColor: 'bg-green-500',
  },
};

/**
 * Icona per tipo di suggestion
 */
const TypeIcon: Record<SuggestionType, React.ReactNode> = {
  autofill: <Wand2 className="w-4 h-4" />,
  correction: <AlertCircle className="w-4 h-4" />,
  tip: <Lightbulb className="w-4 h-4" />,
  optimization: <Sparkles className="w-4 h-4" />,
};

/**
 * Label per tipo di suggestion (italiano)
 */
const typeLabels: Record<SuggestionType, string> = {
  autofill: 'Autocompletamento',
  correction: 'Correzione',
  tip: 'Suggerimento',
  optimization: 'Ottimizzazione',
};

/**
 * Componente singola suggestion
 */
const SuggestionCard: React.FC<{
  suggestion: Suggestion;
  onDismiss: (id: string) => void;
  index: number;
}> = ({ suggestion, onDismiss, index }) => {
  const styles = typeStyles[suggestion.type];
  const confidencePercent = Math.round(suggestion.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={cn(
        "relative mb-3 p-4 rounded-xl border shadow-sm",
        "transition-all duration-200 hover:shadow-md",
        styles.bg,
        styles.border
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Header con tipo e dismiss */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          styles.iconBg,
          styles.iconColor
        )}>
          {typeLabels[suggestion.type]}
        </span>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Ignora suggerimento"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenuto principale */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          styles.iconBg,
          styles.iconColor
        )}>
          {TypeIcon[suggestion.type]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {suggestion.message}
          </p>

          {/* Azioni */}
          {suggestion.action && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  suggestion.action?.handler();
                  onDismiss(suggestion.id);
                }}
                className={cn(
                  "text-xs gap-1",
                  suggestion.type === 'autofill' && "bg-blue-600 hover:bg-blue-700",
                  suggestion.type === 'correction' && "bg-amber-600 hover:bg-amber-700",
                  suggestion.type === 'optimization' && "bg-green-600 hover:bg-green-700",
                  suggestion.type === 'tip' && "bg-gray-600 hover:bg-gray-700"
                )}
              >
                <Check className="w-3 h-3" />
                {suggestion.action.label}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(suggestion.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Ignora
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePercent}%` }}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
            className={cn("h-full rounded-full", styles.progressColor)}
          />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {confidencePercent}%
        </span>
      </div>

      {/* Field indicator (opzionale) */}
      {suggestion.field && (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Campo: <span className="font-medium">{suggestion.field}</span>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Componente principale Proactive Suggestions
 */
export const ProactiveSuggestions: React.FC<ProactiveSuggestionsProps> = ({
  suggestions,
  onDismiss,
  maxSuggestions = 3,
  className,
}) => {
  // Limita numero di suggestion visibili
  const visibleSuggestions = suggestions.slice(0, maxSuggestions);

  if (visibleSuggestions.length === 0) return null;

  return (
    <div 
      className={cn("space-y-1", className)}
      aria-label="Suggerimenti AI proattivi"
    >
      <AnimatePresence mode="popLayout">
        {visibleSuggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </AnimatePresence>

      {/* Indicatore numero suggerimenti nascosti */}
      {suggestions.length > maxSuggestions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-gray-400 py-2"
        >
          +{suggestions.length - maxSuggestions} altri suggerimenti
        </motion.div>
      )}
    </div>
  );
};

/**
 * Versione compatta per inline nei form
 */
export const InlineSuggestion: React.FC<{
  suggestion: Suggestion;
  onApply: () => void;
  onDismiss: () => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const styles = typeStyles[suggestion.type];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        styles.bg,
        styles.border,
        "border"
      )}
    >
      <span className={cn("flex-shrink-0", styles.iconColor)}>
        {TypeIcon[suggestion.type]}
      </span>
      <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">
        {suggestion.message}
      </span>
      <button
        onClick={onApply}
        className={cn(
          "text-xs font-medium px-2 py-1 rounded transition-colors",
          styles.iconBg,
          styles.iconColor,
          "hover:opacity-80"
        )}
      >
        {suggestion.action?.label || 'Applica'}
      </button>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default ProactiveSuggestions;
