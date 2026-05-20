'use client';

import { motion } from 'framer-motion';
import { Smartphone, Monitor, AlertCircle, ArrowRightLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UseFormSessionReturn } from '@/hooks/form-persistence';

interface SessionTakeoverModalProps extends Partial<UseFormSessionReturn> {
  /** Titolo personalizzato */
  title?: string;
  /** Callback quando si prende il controllo */
  onTakeoverConfirm?: () => void;
  /** Callback quando si mantiene l'altra sessione */
  onKeepOtherConfirm?: () => void;
}

/**
 * Modal che appare quando viene rilevata un'altra sessione attiva
 * sullo stesso form (cross-device o cross-tab).
 */
export function SessionTakeoverModal({
  showTakeoverModal,
  otherSession,
  takeOverSession,
  keepOtherSession,
  dismissTakeoverModal,
  title = 'Sessione attiva su un altro dispositivo',
  onTakeoverConfirm,
  onKeepOtherConfirm,
}: SessionTakeoverModalProps) {
  const handleTakeover = (): void => {
    takeOverSession?.();
    onTakeoverConfirm?.();
  };

  const handleKeepOther = (): void => {
    keepOtherSession?.();
    onKeepOtherConfirm?.();
  };

  const handleClose = (): void => {
    dismissTakeoverModal?.();
  };

  if (!showTakeoverModal || !otherSession) return null;

  // Determina il tipo di dispositivo
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(otherSession.deviceInfo.userAgent);
  const DeviceIcon = isMobile ? Smartphone : Monitor;

  // Formatta il tempo
  const getTimeAgo = (): string => {
    const diff = Date.now() - otherSession.lastActivity;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'ora';
    if (minutes < 60) return `${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`;
    return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;
  };

  return (
    <Dialog open={showTakeoverModal} onOpenChange={open => !open && handleClose()}>
      <DialogContent className='sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className='bg-[var(--surface-secondary)] rounded-2xl overflow-hidden'
        >
          {/* Header */}
          <div className='bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] p-6 text-[var(--text-on-brand)]'>
            <div className='flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-xl bg-[var(--surface-secondary)]/20 backdrop-blur-sm flex items-center justify-center'>
                  <ArrowRightLeft className='w-6 h-6' />
                </div>
                <DialogHeader className='space-y-1'>
                  <DialogTitle className='text-xl font-semibold text-[var(--text-on-brand)]'>{title}</DialogTitle>
                </DialogHeader>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleClose}
                className='text-[var(--text-on-brand)]/80 hover:text-[var(--text-on-brand)] hover:bg-[var(--surface-secondary)]/20'
                aria-label='Chiudi'
              >
                <X className='w-5 h-5' />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className='p-6 space-y-6'>
            <DialogDescription className='text-[var(--text-secondary)] text-base'>
              Abbiamo rilevato che hai iniziato una registrazione su un altro dispositivo. Vuoi
              continuare qui o mantenere l&apos;altra sessione?
            </DialogDescription>

            {/* Info sessione altro dispositivo */}
            <div className='bg-[var(--surface-secondary)] rounded-xl p-4'>
              <div className='flex items-center gap-4'>
                <div className='w-14 h-14 rounded-full bg-[var(--status-info-subtle)] flex items-center justify-center'>
                  <DeviceIcon className='w-7 h-7 text-[var(--status-info)]' />
                </div>
                <div className='flex-1'>
                  <p className='font-medium text-[var(--text-primary)]'>
                    {isMobile ? 'Dispositivo mobile' : 'Computer'}
                  </p>
                  <p className='text-sm text-[var(--text-tertiary)]'>Ultima attività: {getTimeAgo()}</p>
                  <p className='text-xs text-[var(--text-tertiary)] mt-1'>
                    {otherSession.deviceInfo.platform} • {otherSession.deviceInfo.screenSize}
                  </p>
                </div>
                <div className='text-right'>
                  <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-success-subtle)] text-[var(--status-success)]'>
                    Attiva
                  </span>
                </div>
              </div>

              {/* Progresso */}
              <div className='mt-4'>
                <div className='flex items-center justify-between text-sm mb-2'>
                  <span className='text-[var(--text-secondary)]'>Progresso</span>
                  <span className='font-medium text-[var(--text-primary)]'>{otherSession.progress}%</span>
                </div>
                <div className='h-2 bg-[var(--border-default)] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-[var(--status-info-subtle)]0 rounded-full transition-all'
                    style={{ width: `${otherSession.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alert */}
            <div className='flex items-start gap-3 p-3 bg-[var(--status-warning)]/5 rounded-xl text-sm text-[var(--status-warning)]'>
              <AlertCircle className='w-5 h-5 flex-shrink-0 mt-0.5' />
              <span>
                Puoi avere una sola sessione attiva per volta. Se continui qui, l&apos;altra
                sessione verrà chiusa.
              </span>
            </div>

            {/* Actions */}
            <div className='space-y-3'>
              <Button
                onClick={handleTakeover}
                className='w-full h-12 bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] hover:from-[var(--status-info)] hover:to-[var(--brand)] text-[var(--text-on-brand)] font-medium'
              >
                <ArrowRightLeft className='w-4 h-4 mr-2' />
                Continua su questo dispositivo
              </Button>

              <Button variant='outline' onClick={handleKeepOther} className='w-full h-11'>
                Mantieni l&apos;altra sessione
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Badge che mostra il dispositivo attuale.
 */
interface CurrentDeviceBadgeProps {
  sessionId?: string;
  className?: string;
}

export function CurrentDeviceBadge({ sessionId, className = '' }: CurrentDeviceBadgeProps) {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const DeviceIcon = isMobile ? Smartphone : Monitor;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-secondary)] rounded-full text-xs text-[var(--text-secondary)] ${className}`}
    >
      <DeviceIcon className='w-3.5 h-3.5' />
      <span>
        {isMobile ? 'Mobile' : 'Desktop'}
        {sessionId && <span className='ml-1 text-[var(--text-tertiary)]'>• {sessionId.slice(-4)}</span>}
      </span>
    </div>
  );
}

export default SessionTakeoverModal;
