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
    bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40/30',
    border: 'border-[var(--status-info)]/30 dark:border-[var(--status-info)]',
    iconBg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40',
    iconColor: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
    progressColor: 'bg-[var(--status-info)]',
  },
  correction: {
    bg: 'bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/30',
    border: 'border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]',
    iconBg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning)]/40',
    iconColor: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    progressColor: 'bg-[var(--status-warning)]',
  },
  tip: {
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]/50',
    border: 'border-[var(--border-default)] dark:border-[var(--border-default)]',
    iconBg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]',
    iconColor: 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]',
    progressColor: 'bg-[var(--surface-secondary)]0',
  },
  optimization: {
    bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30',
    border: 'border-[var(--status-success)]/30 dark:border-[var(--status-success)]',
    iconBg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40',
    iconColor: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
    progressColor: 'bg-[var(--status-success)]',
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
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-tertiary)] transition-colors"
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
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] leading-relaxed">
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
                  suggestion.type === 'autofill' && "bg-[var(--status-info)] hover:bg-[var(--status-info)]",
                  suggestion.type === 'correction' && "bg-[var(--status-warning)] hover:bg-[var(--status-warning)]",
                  suggestion.type === 'optimization' && "bg-[var(--status-success)] hover:bg-[var(--status-success)]",
                  suggestion.type === 'tip' && "bg-[var(--surface-active)] hover:bg-[var(--surface-active)]"
                )}
              >
                <Check className="w-3 h-3" />
                {suggestion.action.label}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(suggestion.id)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                Ignora
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePercent}%` }}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
            className={cn("h-full rounded-full", styles.progressColor)}
          />
        </div>
        <span className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-medium">
          {confidencePercent}%
        </span>
      </div>

      {/* Field indicator (opzionale) */}
      {suggestion.field && (
        <div className="mt-2 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
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
          className="text-center text-xs text-[var(--text-tertiary)] py-2"
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
      <span className="flex-1 text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] truncate">
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
        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default ProactiveSuggestions;
