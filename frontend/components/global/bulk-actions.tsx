'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleButton } from '@/components/ui/apple-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { X, Trash2, Download, RefreshCw } from 'lucide-react';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  /** If true, shows a confirmation dialog before executing */
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onClick: (selectedIds: string[]) => void | Promise<void>;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  onDeselectAll: () => void;
  actions: BulkAction[];
  /** Optional: entity name for display, e.g. "fatture" */
  entityName?: string;
}

export function BulkActionsBar({
  selectedIds,
  onDeselectAll,
  actions,
  entityName = 'elementi',
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const count = selectedIds.length;
  if (count === 0) return null;

  const handleAction = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }
    setActionLoading(true);
    try {
      await action.onClick(selectedIds);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await confirmAction.onClick(selectedIds);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(95vw,700px)]"
        >
          <div className="bg-[var(--surface-secondary)]/95 dark:bg-[var(--surface-elevated)]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {count} {entityName} selezionat{count === 1 ? 'o' : 'i'}
                </span>
                <button
                  onClick={onDeselectAll}
                  className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors underline"
                >
                  Deseleziona tutto
                </button>
              </div>

              <div className="flex items-center gap-2">
                {actions.map(action => (
                  <AppleButton
                    key={action.id}
                    variant={action.variant === 'danger' ? 'ghost' : 'secondary'}
                    size="sm"
                    icon={action.icon}
                    loading={actionLoading}
                    onClick={() => handleAction(action)}
                    className={
                      action.variant === 'danger'
                        ? 'text-[var(--status-error)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-subtle)] dark:hover:bg-[var(--status-error-subtle)]'
                        : ''
                    }
                  >
                    {action.label}
                  </AppleButton>
                ))}
                <button
                  onClick={onDeselectAll}
                  className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Chiudi barra azioni"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={open => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmAction?.confirmTitle || 'Conferma azione'}
        description={
          confirmAction?.confirmDescription ||
          `Sei sicuro di voler procedere con ${count} ${entityName}?`
        }
        confirmLabel="Conferma"
        variant={confirmAction?.variant === 'danger' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
        loading={actionLoading}
      />
    </>
  );
}

/**
 * Preset bulk actions for common operations.
 */
export function createDeleteAction(
  onDelete: (ids: string[]) => void | Promise<void>,
  entityName = 'elementi',
): BulkAction {
  return {
    id: 'delete',
    label: 'Elimina',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    variant: 'danger',
    requiresConfirmation: true,
    confirmTitle: `Elimina ${entityName} selezionati`,
    confirmDescription: `Sei sicuro di voler eliminare gli ${entityName} selezionati? Questa azione non puo essere annullata.`,
    onClick: onDelete,
  };
}

export function createExportAction(
  onExport: (ids: string[]) => void | Promise<void>,
): BulkAction {
  return {
    id: 'export',
    label: 'Esporta',
    icon: <Download className="h-3.5 w-3.5" />,
    onClick: onExport,
  };
}

export function createStatusChangeAction(
  label: string,
  onStatusChange: (ids: string[]) => void | Promise<void>,
): BulkAction {
  return {
    id: 'status-change',
    label,
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    onClick: onStatusChange,
  };
}
