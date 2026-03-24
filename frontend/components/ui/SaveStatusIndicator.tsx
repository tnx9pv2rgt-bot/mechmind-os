'use client';

/**
 * SaveStatusIndicator Component
 *
 * Indicatore di stato salvataggio in stile Notion/Linear.
 * Mostra transizioni fluide tra stati: "Salvataggio..." → "Salvato 2 secondi fa" → scompare
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SaveStatusIndicator status="saving" />
 *
 * // With last saved timestamp
 * <SaveStatusIndicator
 *   status="saved"
 *   lastSaved={new Date()}
 *   lastSavedText="Salvato 2 secondi fa"
 * />
 *
 * // With pending changes (offline)
 * <SaveStatusIndicator
 *   status="offline"
 *   pendingChanges={3}
 * />
 *
 * // With conflict
 * <SaveStatusIndicator
 *   status="conflict"
 *   onResolve={() => handleResolve()}
 * />
 * ```
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, WifiOff, AlertCircle, Cloud, RotateCcw, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/hooks/realtime/useRealtimeSave';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveStatusIndicatorProps {
  /** Stato corrente del salvataggio */
  status: SaveStatus;
  /** Timestamp dell'ultimo salvataggio */
  lastSaved?: Date | null;
  /** Testo formattato dell'ultimo salvataggio (es: "2 secondi fa") */
  lastSavedText?: string;
  /** Numero di modifiche in attesa (offline mode) */
  pendingChanges?: number;
  /** Se mostrare l'icona (default: true) */
  showIcon?: boolean;
  /** Se usare la versione compatta (default: false) */
  compact?: boolean;
  /** Callback per il retry su errore */
  onRetry?: () => void;
  /** Callback per risolvere conflitto */
  onResolve?: () => void;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Durata in ms prima che lo stato "saved" scompaia (default: 3000) */
  hideDelay?: number;
}

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

type StatusConfig = {
  icon: React.ReactNode;
  text: string;
  className: string;
  iconClassName: string;
  show: boolean;
};

const getStatusConfig = (
  status: SaveStatus,
  lastSavedText: string,
  pendingChanges: number
): StatusConfig => {
  switch (status) {
    case 'saving':
      return {
        icon: <Loader2 className='w-3 h-3 animate-spin' />,
        text: 'Salvataggio...',
        className: 'text-blue-600',
        iconClassName: 'text-blue-500',
        show: true,
      };

    case 'saved':
      return {
        icon: <Check className='w-3 h-3' />,
        text: lastSavedText || 'Salvato',
        className: 'text-green-600',
        iconClassName: 'text-green-500',
        show: true,
      };

    case 'error':
      return {
        icon: <AlertCircle className='w-3 h-3' />,
        text: 'Errore di salvataggio',
        className: 'text-red-600',
        iconClassName: 'text-red-500',
        show: true,
      };

    case 'offline':
      return {
        icon: <WifiOff className='w-3 h-3' />,
        text: pendingChanges > 0 ? `Offline · ${pendingChanges} in attesa` : 'Offline',
        className: 'text-amber-600',
        iconClassName: 'text-amber-500',
        show: true,
      };

    case 'conflict':
      return {
        icon: <GitMerge className='w-3 h-3' />,
        text: 'Conflitto rilevato',
        className: 'text-orange-600',
        iconClassName: 'text-orange-500',
        show: true,
      };

    case 'idle':
    default:
      return {
        icon: <Cloud className='w-3 h-3' />,
        text: '',
        className: 'text-gray-400',
        iconClassName: 'text-gray-300',
        show: false,
      };
  }
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  initial: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

const iconVariants = {
  saving: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  saved: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
    },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SaveStatusIndicator({
  status,
  lastSaved,
  lastSavedText,
  pendingChanges = 0,
  showIcon = true,
  compact = false,
  onRetry,
  onResolve,
  className,
  hideDelay = 3000,
}: SaveStatusIndicatorProps) {
  const config = getStatusConfig(status, lastSavedText || '', pendingChanges);

  // Auto-hide saved status
  const [showSaved, setShowSaved] = React.useState(true);

  React.useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [status, lastSaved, hideDelay]);

  // Don't render if idle or saved that should be hidden
  if (status === 'idle' || (status === 'saved' && !showSaved)) {
    return null;
  }

  if (compact) {
    return (
      <AnimatePresence mode='wait'>
        <motion.div
          key={status}
          variants={containerVariants}
          initial='initial'
          animate='animate'
          exit='exit'
          className={cn(
            'flex items-center justify-center',
            'w-6 h-6 rounded-full',
            'bg-white shadow-sm border',
            status === 'saving' && 'border-blue-200',
            status === 'saved' && 'border-green-200',
            status === 'error' && 'border-red-200',
            status === 'offline' && 'border-amber-200',
            status === 'conflict' && 'border-orange-200',
            className
          )}
          title={config.text}
          aria-label={config.text}
        >
          <span className={config.iconClassName}>{config.icon}</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={status}
        variants={containerVariants}
        initial='initial'
        animate='animate'
        exit='exit'
        className={cn(
          'flex items-center gap-1.5',
          'text-xs font-medium',
          'px-2 py-1 rounded-md',
          'transition-colors duration-200',
          status === 'saving' && 'bg-blue-50',
          status === 'saved' && 'bg-green-50',
          status === 'error' && 'bg-red-50',
          status === 'offline' && 'bg-amber-50',
          status === 'conflict' && 'bg-orange-50',
          className
        )}
      >
        {showIcon && (
          <motion.span
            variants={iconVariants}
            animate={status === 'saving' ? 'saving' : status === 'saved' ? 'saved' : undefined}
            className={config.iconClassName}
          >
            {config.icon}
          </motion.span>
        )}

        <span className={config.className}>{config.text}</span>

        {/* Retry button for error state */}
        {status === 'error' && onRetry && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className={cn(
              'ml-1 p-0.5 rounded',
              'hover:bg-red-100',
              'transition-colors duration-150'
            )}
            title='Riprova'
            aria-label='Riprova salvataggio'
          >
            <RotateCcw className='w-3 h-3 text-red-600' />
          </motion.button>
        )}

        {/* Resolve button for conflict state */}
        {status === 'conflict' && onResolve && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResolve}
            className={cn(
              'ml-1 px-1.5 py-0.5 rounded text-[10px]',
              'bg-orange-100 hover:bg-orange-200',
              'text-orange-700',
              'transition-colors duration-150'
            )}
          >
            Risolvi
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// FIXED POSITION INDICATOR (bottom-left)
// ============================================================================

export interface FixedSaveStatusIndicatorProps extends SaveStatusIndicatorProps {
  /** Posizione verticale dal basso (default: 24px) */
  bottom?: number;
  /** Posizione orizzontale da sinistra (default: 24px) */
  left?: number;
  /** Se mostrare lo sfondo (default: true) */
  showBackground?: boolean;
}

/**
 * Indicatore di stato in posizione fissa (bottom-left)
 * Ideale per form lunghi dove l'indicatore deve essere sempre visibile
 */
export function FixedSaveStatusIndicator({
  bottom = 24,
  left = 24,
  showBackground = true,
  ...props
}: FixedSaveStatusIndicatorProps) {
  return (
    <div
      className={cn(
        'fixed z-50',
        showBackground && 'bg-white/90 backdrop-blur-sm shadow-lg border rounded-lg px-3 py-2'
      )}
      style={{ bottom, left }}
    >
      <SaveStatusIndicator {...props} />
    </div>
  );
}

// ============================================================================
// FORM HEADER INDICATOR
// ============================================================================

export interface FormHeaderSaveIndicatorProps extends SaveStatusIndicatorProps {
  /** Titolo del form */
  title?: string;
  /** Se mostrare il bordo inferiore (default: true) */
  showBorder?: boolean;
}

/**
 * Indicatore integrato nell'header del form
 * Mostra il titolo e lo stato di salvataggio affiancati
 */
export function FormHeaderSaveIndicator({
  title,
  showBorder = true,
  ...props
}: FormHeaderSaveIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-between', 'px-4 py-3', showBorder && 'border-b')}>
      {title && <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>}
      <SaveStatusIndicator {...props} />
    </div>
  );
}

// ============================================================================
// IMPORT REACT FOR HOOKS
// ============================================================================

import * as React from 'react';

// ============================================================================
// EXPORTS
// ============================================================================

export default SaveStatusIndicator;
