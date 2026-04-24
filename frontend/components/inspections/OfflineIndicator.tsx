'use client';

/**
 * OfflineIndicator Component - MechMind OS Inspections
 * 
 * Shows offline/sync status for the inspection app.
 * Supports multiple variants: badge, banner, minimal.
 * 
 * @module components/inspections/OfflineIndicator
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Clock,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  isOnline,
  listenToNetworkChanges,
  getPendingSyncCount,
  processSyncQueue,
  type SyncQueueResult,
} from '@/lib/services/offlineSyncService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OfflineIndicatorProps {
  /** Visual variant of the indicator */
  variant?: 'badge' | 'banner' | 'minimal';
  /** Whether to show the sync button */
  showSyncButton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when sync completes */
  onSyncComplete?: (result: SyncQueueResult) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
  /** Auto-hide success message after ms (0 = never) */
  autoHideSuccess?: number;
}

interface SyncState {
  isSyncing: boolean;
  progress: number;
  totalItems: number;
  processedItems: number;
  lastSyncTime: number | null;
  lastSyncResult: SyncQueueResult | null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format time ago from timestamp
 */
function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Mai';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'Adesso';
  if (seconds < 60) return `${seconds} sec fa`;
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  return `${days} giorni fa`;
}

/**
 * Format date time for display
 */
function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Connection Status Badge - Shows online/offline status
 */
function ConnectionStatusBadge({
  online,
  pendingCount,
}: {
  online: boolean;
  pendingCount: number;
}) {
  if (online) {
    return (
      <Badge
        variant="default"
        className="bg-[var(--status-success-subtle)] text-[var(--status-success)] hover:bg-[var(--status-success-subtle)] border-[var(--status-success)]/30 gap-1.5"
      >
        <Wifi className="w-3 h-3" />
        <span>Online</span>
        {pendingCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-[var(--status-success)]/20 rounded-full text-xs">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className="bg-[var(--status-error-subtle)] text-[var(--status-error)] hover:bg-[var(--status-error-subtle)] border-[var(--status-error)]/30 gap-1.5"
    >
      <WifiOff className="w-3 h-3" />
      <span>Offline</span>
      {pendingCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-[var(--status-error)]/20 rounded-full text-xs">
          {pendingCount}
        </span>
      )}
    </Badge>
  );
}

/**
 * Pending Sync Badge - Shows count of items waiting to sync
 */
function PendingSyncBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="relative"
    >
      <Badge
        variant="secondary"
        className="bg-[var(--status-warning-subtle)] text-[var(--status-warning)] hover:bg-[var(--status-warning)]/10 border-[var(--status-warning)]/30 gap-1.5"
      >
        <Cloud className="w-3 h-3" />
        <span>{count} in attesa</span>
      </Badge>
    </motion.div>
  );
}

/**
 * Sync Progress Indicator - Shows sync progress with spinner and progress bar
 */
function SyncProgress({
  progress,
  totalItems,
  processedItems,
}: {
  progress: number;
  totalItems: number;
  processedItems: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full space-y-2"
    >
      <div className="flex items-center gap-2 text-sm text-[var(--status-info)]">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="font-medium">
          Sincronizzazione in corso... ({processedItems}/{totalItems})
        </span>
      </div>
      <Progress value={progress} className="h-2 w-full" />
      <p className="text-xs text-[var(--status-info)]">
        {Math.round(progress)}% completato
      </p>
    </motion.div>
  );
}

/**
 * Success Message - Shows when sync completes
 */
function SyncSuccessMessage({
  result,
  onDismiss,
}: {
  result: SyncQueueResult;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 bg-[var(--status-success-subtle)] border border-[var(--status-success)]/30 rounded-lg"
    >
      <div className="w-8 h-8 rounded-full bg-[var(--status-success-subtle)] flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--status-success)]">
          Sincronizzazione completata!
        </p>
        <p className="text-xs text-[var(--status-success)]">
          {result.successful} elementi sincronizzati
          {result.failed > 0 && `, ${result.failed} falliti`}
          {result.conflicts > 0 && `, ${result.conflicts} conflitti risolti`}
        </p>
      </div>
      {onDismiss && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="h-8 px-2 text-[var(--status-success)] hover:bg-[var(--status-success-subtle)]"
        >
          Chiudi
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Sync Error Message - Shows when sync fails
 */
function SyncErrorMessage({
  failedCount,
  onRetry,
}: {
  failedCount: number;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 rounded-lg"
    >
      <div className="w-8 h-8 rounded-full bg-[var(--status-error-subtle)] flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-[var(--status-error)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--status-error)]">
          Errore di sincronizzazione
        </p>
        <p className="text-xs text-[var(--status-error)]">
          {failedCount} elementi non sono stati sincronizzati
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="h-8 border-[var(--status-error)]/30 text-[var(--status-error)] hover:bg-[var(--status-error-subtle)]"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1" />
        Riprova
      </Button>
    </motion.div>
  );
}

/**
 * Last Sync Time - Shows when the last sync occurred
 */
function LastSyncTime({ timestamp }: { timestamp: number | null }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
      <Clock className="w-3 h-3" />
      <span>Ultima sincronizzazione: {formatTimeAgo(timestamp)}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT - VARIANTS
// ============================================================================

/**
 * Badge Variant - Compact inline indicator
 */
function BadgeVariant({
  online,
  pendingCount,
  syncState,
  onSync,
  showSyncButton,
}: {
  online: boolean;
  pendingCount: number;
  syncState: SyncState;
  onSync: () => void;
  showSyncButton: boolean;
}) {
  if (syncState.isSyncing) {
    return (
      <div className="w-64">
        <SyncProgress
          progress={syncState.progress}
          totalItems={syncState.totalItems}
          processedItems={syncState.processedItems}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <ConnectionStatusBadge online={online} pendingCount={pendingCount} />
      
      {online && pendingCount > 0 && (
        <PendingSyncBadge count={pendingCount} />
      )}

      {showSyncButton && online && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={onSync}
          className="h-7 px-2 text-xs gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Sincronizza
        </Button>
      )}

      {syncState.lastSyncResult && !syncState.isSyncing && (
        <LastSyncTime timestamp={syncState.lastSyncTime} />
      )}
    </div>
  );
}

/**
 * Minimal Variant - Ultra-compact indicator
 */
function MinimalVariant({
  online,
  pendingCount,
  syncState,
  onSync,
}: {
  online: boolean;
  pendingCount: number;
  syncState: SyncState;
  onSync: () => void;
}) {
  if (syncState.isSyncing) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--status-info-subtle)] text-[var(--status-info)] rounded text-xs"
        title="Sincronizzazione in corso..."
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{syncState.progress.toFixed(0)}%</span>
      </div>
    );
  }

  // Offline indicator
  if (!online) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--status-error-subtle)] text-[var(--status-error)] rounded text-xs cursor-pointer hover:bg-[var(--status-error)]/20 transition-colors"
        title={`${pendingCount} elementi in attesa`}
      >
        <WifiOff className="w-3 h-3" />
        {pendingCount > 0 && <span>{pendingCount}</span>}
      </div>
    );
  }

  // Online with pending items
  if (pendingCount > 0) {
    return (
      <button
        onClick={onSync}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--status-warning-subtle)] text-[var(--status-warning)] rounded text-xs hover:bg-[var(--status-warning)]/20 transition-colors"
        title={`${pendingCount} elementi da sincronizzare`}
      >
        <CloudOff className="w-3 h-3" />
        <span>{pendingCount}</span>
      </button>
    );
  }

  // Online - synced
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--status-success-subtle)] text-[var(--status-success)] rounded text-xs"
      title="Sincronizzato"
    >
      <Cloud className="w-3 h-3" />
    </div>
  );
}

/**
 * Banner Variant - Full-width top banner
 */
function BannerVariant({
  online,
  pendingCount,
  syncState,
  onSync,
  showSyncButton,
  onDismissSuccess,
}: {
  online: boolean;
  pendingCount: number;
  syncState: SyncState;
  onSync: () => void;
  showSyncButton: boolean;
  onDismissSuccess: () => void;
}) {
  // Syncing state
  if (syncState.isSyncing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-[var(--status-info-subtle)] border-b border-[var(--status-info)]/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto">
          <SyncProgress
            progress={syncState.progress}
            totalItems={syncState.totalItems}
            processedItems={syncState.processedItems}
          />
        </div>
      </motion.div>
    );
  }

  // Success state
  if (syncState.lastSyncResult && syncState.lastSyncResult.failed === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-[var(--status-success-subtle)] border-b border-[var(--status-success)]/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto">
          <SyncSuccessMessage
            result={syncState.lastSyncResult}
            onDismiss={onDismissSuccess}
          />
        </div>
      </motion.div>
    );
  }

  // Error state
  if (syncState.lastSyncResult && syncState.lastSyncResult.failed > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-[var(--status-error-subtle)] border-b border-[var(--status-error)]/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto">
          <SyncErrorMessage
            failedCount={syncState.lastSyncResult.failed}
            onRetry={onSync}
          />
        </div>
      </motion.div>
    );
  }

  // Offline state
  if (!online) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-[var(--status-error-subtle)] border-b border-[var(--status-error)]/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--status-error-subtle)] flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-[var(--status-error)]" />
            </div>
            <div>
              <h3 className="font-medium text-[var(--status-error)]">Sei offline</h3>
              <p className="text-sm text-[var(--status-error)]">
                Connessione persa. I tuoi dati sono al sicuro e verranno sincronizzati automaticamente quando tornerai online.
              </p>
            </div>
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--status-error-subtle)] rounded-full text-sm text-[var(--status-error)]">
              <UploadCloud className="w-4 h-4" />
              <span>{pendingCount} in attesa</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Online with pending items
  if (online && pendingCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-[var(--status-warning)]/5 border-b border-[var(--status-warning)]/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--status-warning)]/10 flex items-center justify-center">
              <CloudOff className="w-5 h-5 text-[var(--status-warning)]" />
            </div>
            <div>
              <h3 className="font-medium text-[var(--status-warning)]">Dati in attesa</h3>
              <p className="text-sm text-[var(--status-warning)]">
                {pendingCount} elementi in coda. Verranno inviati automaticamente.
              </p>
            </div>
          </div>
          
          {showSyncButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              className="border-[var(--status-warning)]/30 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/10"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Sincronizza ora
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Online - synced (minimal banner)
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full bg-[var(--status-success-subtle)] border-b border-[var(--status-success)]/30 px-4 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-[var(--status-success)]">
        <CheckCircle2 className="w-4 h-4" />
        <span>Tutti i dati sono sincronizzati</span>
        <span className="text-[var(--status-success)]">•</span>
        <LastSyncTime timestamp={syncState.lastSyncTime} />
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OfflineIndicator - Main component for showing offline/sync status
 * 
 * Features:
 * - Connection Status Badge (online/offline)
 * - Pending Sync Counter
 * - Sync Progress with progress bar
 * - Sync Now Button
 * - Last Sync Time display
 * 
 * @example
 * ```tsx
 * // Badge variant (inline)
 * <OfflineIndicator variant="badge" showSyncButton />
 * 
 * // Banner variant (full width at top)
 * <OfflineIndicator variant="banner" />
 * 
 * // Minimal variant (ultra-compact)
 * <OfflineIndicator variant="minimal" />
 * ```
 */
export function OfflineIndicator({
  variant = 'badge',
  showSyncButton = true,
  className,
  onSyncComplete,
  onSyncError,
  autoHideSuccess = 5000,
}: OfflineIndicatorProps) {
  const [online, setOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    progress: 0,
    totalItems: 0,
    processedItems: 0,
    lastSyncTime: null,
    lastSyncResult: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and listen for network changes
  useEffect(() => {
    // Set initial online status
    setOnline(isOnline());

    // Listen for network changes
    const unsubscribe = listenToNetworkChanges(
      () => setOnline(true),
      () => setOnline(false)
    );

    return () => {
      unsubscribe();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, []);

  // Poll for pending items count
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const count = await getPendingSyncCount();
        setPendingCount(count);
      } catch (error) {
        console.error('[OfflineIndicator] Error getting pending count:', error);
      }
    };

    // Update immediately
    updatePendingCount();

    // Poll every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle sync operation
  const handleSync = useCallback(async () => {
    if (syncState.isSyncing || !online) return;

    setSyncState((prev) => ({
      ...prev,
      isSyncing: true,
      progress: 0,
      totalItems: pendingCount,
      processedItems: 0,
    }));

    // Simulate progress updates
    syncIntervalRef.current = setInterval(() => {
      setSyncState((prev) => {
        const newProgress = Math.min(prev.progress + 5, 90);
        const newProcessed = Math.floor((newProgress / 100) * prev.totalItems);
        return {
          ...prev,
          progress: newProgress,
          processedItems: newProcessed,
        };
      });
    }, 200);

    try {
      const result = await processSyncQueue();

      // Clear progress interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      setSyncState({
        isSyncing: false,
        progress: 100,
        totalItems: result.total,
        processedItems: result.successful,
        lastSyncTime: Date.now(),
        lastSyncResult: result,
      });

      // Update pending count
      const newCount = await getPendingSyncCount();
      setPendingCount(newCount);

      onSyncComplete?.(result);

      // Auto-hide success message
      if (autoHideSuccess > 0 && result.failed === 0) {
        autoHideTimeoutRef.current = setTimeout(() => {
          setSyncState((prev) => ({
            ...prev,
            lastSyncResult: null,
          }));
        }, autoHideSuccess);
      }
    } catch (error) {
      // Clear progress interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        lastSyncTime: Date.now(),
        lastSyncResult: {
          total: pendingCount,
          successful: 0,
          failed: pendingCount,
          conflicts: 0,
          results: [],
          completedAt: Date.now(),
        },
      }));

      onSyncError?.(error as Error);
    }
  }, [online, pendingCount, syncState.isSyncing, onSyncComplete, onSyncError, autoHideSuccess]);

  // Dismiss success message
  const handleDismissSuccess = useCallback(() => {
    setSyncState((prev) => ({
      ...prev,
      lastSyncResult: null,
    }));
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
  }, []);

  // Render based on variant
  const content = (() => {
    switch (variant) {
      case 'banner':
        return (
          <BannerVariant
            online={online}
            pendingCount={pendingCount}
            syncState={syncState}
            onSync={handleSync}
            showSyncButton={showSyncButton}
            onDismissSuccess={handleDismissSuccess}
          />
        );
      case 'minimal':
        return (
          <MinimalVariant
            online={online}
            pendingCount={pendingCount}
            syncState={syncState}
            onSync={handleSync}
          />
        );
      case 'badge':
      default:
        return (
          <BadgeVariant
            online={online}
            pendingCount={pendingCount}
            syncState={syncState}
            onSync={handleSync}
            showSyncButton={showSyncButton}
          />
        );
    }
  })();

  return (
    <div className={cn(className)}>
      <AnimatePresence mode="wait">
        {content}
      </AnimatePresence>
    </div>
  );
}

/**
 * Fixed position offline indicator - Floats at bottom-right
 * Useful for persistent sync status display
 */
export function FixedOfflineIndicator(props: Omit<OfflineIndicatorProps, 'variant'>) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-[var(--surface-secondary)] rounded-xl shadow-lg border border-[var(--border-default)] p-4 min-w-[280px]">
        <OfflineIndicator {...props} variant="badge" />
      </div>
    </div>
  );
}

export default OfflineIndicator;
