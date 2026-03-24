'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Hook that tracks unsaved changes and prevents accidental navigation.
 * Returns a dialog component that must be rendered in the tree.
 */
export function useUnsavedChanges(isDirty: boolean): {
  UnsavedChangesDialog: React.FC;
  confirmNavigation: (callback: () => void) => void;
} {
  const [pendingCallback, setPendingCallback] = React.useState<(() => void) | null>(null);
  const isOpen = pendingCallback !== null;

  // Block browser navigation (refresh, close tab)
  React.useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent): void {
      e.preventDefault();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = React.useCallback(
    (callback: () => void): void => {
      if (isDirty) {
        setPendingCallback(() => callback);
      } else {
        callback();
      }
    },
    [isDirty]
  );

  const handleConfirm = React.useCallback((): void => {
    if (pendingCallback) {
      pendingCallback();
    }
    setPendingCallback(null);
  }, [pendingCallback]);

  const handleCancel = React.useCallback((): void => {
    setPendingCallback(null);
  }, []);

  const UnsavedChangesDialog: React.FC = React.useCallback(
    () => (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <DialogTitle className="text-center">
              Modifiche non salvate
            </DialogTitle>
            <DialogDescription className="text-center">
              Hai modifiche non salvate. Vuoi davvero uscire? Le modifiche andranno perse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center">
            <Button variant="outline" onClick={handleCancel}>
              Resta sulla pagina
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Esci senza salvare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, handleCancel, handleConfirm]
  );

  return { UnsavedChangesDialog, confirmNavigation };
}
