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
          className='bg-white rounded-2xl overflow-hidden'
        >
          {/* Header */}
          <div className='bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white'>
            <div className='flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center'>
                  <ArrowRightLeft className='w-6 h-6' />
                </div>
                <DialogHeader className='space-y-1'>
                  <DialogTitle className='text-xl font-semibold text-white'>{title}</DialogTitle>
                </DialogHeader>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleClose}
                className='text-white/80 hover:text-white hover:bg-white/20'
                aria-label='Chiudi'
              >
                <X className='w-5 h-5' />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className='p-6 space-y-6'>
            <DialogDescription className='text-gray-600 text-base'>
              Abbiamo rilevato che hai iniziato una registrazione su un altro dispositivo. Vuoi
              continuare qui o mantenere l&apos;altra sessione?
            </DialogDescription>

            {/* Info sessione altro dispositivo */}
            <div className='bg-gray-50 rounded-xl p-4'>
              <div className='flex items-center gap-4'>
                <div className='w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center'>
                  <DeviceIcon className='w-7 h-7 text-blue-600' />
                </div>
                <div className='flex-1'>
                  <p className='font-medium text-gray-900'>
                    {isMobile ? 'Dispositivo mobile' : 'Computer'}
                  </p>
                  <p className='text-sm text-gray-500'>Ultima attività: {getTimeAgo()}</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    {otherSession.deviceInfo.platform} • {otherSession.deviceInfo.screenSize}
                  </p>
                </div>
                <div className='text-right'>
                  <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                    Attiva
                  </span>
                </div>
              </div>

              {/* Progresso */}
              <div className='mt-4'>
                <div className='flex items-center justify-between text-sm mb-2'>
                  <span className='text-gray-600'>Progresso</span>
                  <span className='font-medium text-gray-900'>{otherSession.progress}%</span>
                </div>
                <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-blue-500 rounded-full transition-all'
                    style={{ width: `${otherSession.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alert */}
            <div className='flex items-start gap-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-700'>
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
                className='w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium'
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 ${className}`}
    >
      <DeviceIcon className='w-3.5 h-3.5' />
      <span>
        {isMobile ? 'Mobile' : 'Desktop'}
        {sessionId && <span className='ml-1 text-gray-400'>• {sessionId.slice(-4)}</span>}
      </span>
    </div>
  );
}

export default SessionTakeoverModal;
