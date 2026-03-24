'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  WifiOff,
  ServerCrash,
  FileQuestion,
  ShieldAlert,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ErrorVariant = 'network-error' | 'server-error' | 'not-found' | 'forbidden';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  errorCode?: string;
  variant?: ErrorVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<ErrorVariant, { icon: LucideIcon; title: string; description: string }> = {
  'network-error': {
    icon: WifiOff,
    title: 'Errore di connessione',
    description: 'Impossibile connettersi al server. Verifica la tua connessione internet e riprova.',
  },
  'server-error': {
    icon: ServerCrash,
    title: 'Errore del server',
    description: 'Si è verificato un errore interno. Il nostro team è stato notificato. Riprova tra qualche minuto.',
  },
  'not-found': {
    icon: FileQuestion,
    title: 'Risorsa non trovata',
    description: 'L\'elemento richiesto non esiste o è stato rimosso.',
  },
  'forbidden': {
    icon: ShieldAlert,
    title: 'Accesso negato',
    description: 'Non hai i permessi necessari per accedere a questa risorsa.',
  },
};

export function ErrorState({
  title,
  description,
  onRetry,
  errorCode,
  variant = 'server-error',
  className,
}: ErrorStateProps): React.ReactElement {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className
      )}
      role="alert"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
        <Icon className="h-10 w-10 text-destructive" strokeWidth={1.5} />
      </div>

      <h3 className="mt-6 text-title-3 font-semibold text-gray-900 dark:text-gray-100">
        {displayTitle}
      </h3>
      <p className="mt-2 max-w-md text-body text-gray-500 dark:text-gray-400">
        {displayDescription}
      </p>

      {errorCode && (
        <p className="mt-3 font-mono text-footnote text-gray-400 dark:text-gray-500">
          Codice: {errorCode}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        {onRetry && (
          <Button variant="default" size="lg" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        )}
        <Link href="/dashboard">
          <Button variant="outline" size="lg">
            Torna alla Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
