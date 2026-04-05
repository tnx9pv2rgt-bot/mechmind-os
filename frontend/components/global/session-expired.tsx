'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionExpiredProps {
  open: boolean;
}

export function SessionExpiredDialog({ open }: SessionExpiredProps): React.ReactElement {
  const router = useRouter();

  function handleLogin(): void {
    router.push('/auth');
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[100] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-gray-200 bg-white p-8 shadow-apple-lg dark:border-gray-700 dark:bg-[var(--surface-elevated)]"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Sessione scaduta</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            La tua sessione è scaduta. Accedi nuovamente per continuare.
          </DialogPrimitive.Description>
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40">
              <ShieldAlert className="h-8 w-8 text-orange-500" />
            </div>

            <h2 className="text-title-3 font-semibold text-gray-900 dark:text-gray-100">
              La tua sessione è scaduta
            </h2>
            <p className="mt-2 text-body text-gray-500 dark:text-gray-400">
              Accedi nuovamente per continuare a utilizzare MechMind.
            </p>

            <Button
              variant="default"
              size="lg"
              className="mt-6 w-full"
              onClick={handleLogin}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Accedi
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
