'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UseOfflineQueueReturn } from '@/hooks/form-persistence';

interface OfflineIndicatorProps extends Partial<UseOfflineQueueReturn> {
  /** Messaggio quando offline */
  offlineMessage?: string;
  /** Messaggio quando online con coda */
  syncingMessage?: string;
  /** Classe CSS aggiuntiva */
  className?: string;
}

/**
 * Banner che mostra lo stato della connessione e della coda offline.
 */
export function OfflineIndicator({
  isOnline,
  queueLength,
  isProcessing,
  processQueue,
  completedRequests,
  failedRequests,
  offlineMessage = 'Connessione persa. I tuoi dati sono al sicuro e verranno sincronizzati automaticamente.',
  syncingMessage,
  className = '',
}: OfflineIndicatorProps) {
  const handleRetry = (): void => {
    processQueue?.();
  };

  const showOffline = isOnline === false;
  const showSyncing = isOnline && (queueLength ?? 0) > 0;
  const showSuccess = isOnline && (completedRequests?.length ?? 0) > 0 && (queueLength ?? 0) === 0;

  return (
    <AnimatePresence mode="wait">
      {/* Offline State */}
      {showOffline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`bg-red-50 border-b border-red-200 px-4 py-3 ${className}`}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-900">Sei offline</h3>
                <p className="text-sm text-red-700">{offlineMessage}</p>
              </div>
            </div>
            
            {queueLength ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full text-sm text-red-700">
                <Upload className="w-4 h-4" />
                <span>{queueLength} in attesa</span>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}

      {/* Syncing State */}
      {showSyncing && (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`bg-blue-50 border-b border-blue-200 px-4 py-3 ${className}`}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-blue-900">
                  {isProcessing ? 'Sincronizzazione in corso...' : 'Dati in attesa'}
                </h3>
                <p className="text-sm text-blue-700">
                  {syncingMessage || `${queueLength} richiest${queueLength === 1 ? 'a' : 'e'} in coda. Verranno inviate automaticamente.`}
                </p>
              </div>
            </div>
            
            {!isProcessing && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Sincronizza ora
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Success State */}
      {showSuccess && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`bg-green-50 border-b border-green-200 px-4 py-3 ${className}`}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">Connessione ripristinata</h3>
                <p className="text-sm text-green-700">
                  Tutti i dati sono stati sincronizzati con successo.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sincronizzato</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Badge compatta per mostrare lo stato offline.
 */
interface OfflineBadgeProps {
  isOnline: boolean;
  queueLength?: number;
  onClick?: () => void;
}

export function OfflineBadge({ isOnline, queueLength = 0, onClick }: OfflineBadgeProps) {
  if (isOnline && queueLength === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        isOnline
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
      }`}
    >
      {isOnline ? (
        <>
          <Upload className="w-3.5 h-3.5" />
          <span>{queueLength} in coda</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline</span>
        </>
      )}
    </button>
  );
}

/**
 * Toast per errori di sincronizzazione.
 */
interface SyncErrorToastProps {
  failedCount: number;
  onRetry: () => void;
  onDismiss: () => void;
}

export function SyncErrorToast({ failedCount, onRetry, onDismiss }: SyncErrorToastProps) {
  if (failedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-xl shadow-xl border border-red-200 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">Errore di sincronizzazione</h4>
          <p className="text-sm text-gray-500 mt-1">
            {failedCount} richiest{failedCount === 1 ? 'a' : 'e'} non è andata a buon fine.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onRetry} variant="outline" className="h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Riprova
            </Button>
            <Button size="sm" onClick={onDismiss} variant="ghost" className="h-8">
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default OfflineIndicator;
