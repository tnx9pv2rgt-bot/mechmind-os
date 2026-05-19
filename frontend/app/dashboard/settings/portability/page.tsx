'use client';

import { useState } from 'react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Download, DatabaseZap, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type ExportState = 'idle' | 'loading' | 'done' | 'error';

export default function PortabilityPage() {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);

  async function handleExport() {
    setState('loading');
    setProgress(10);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 800);

    try {
      const res = await fetch('/api/gdpr/export-full');

      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        setState('error');
        toast.error('Errore durante la generazione del file');
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `nexo-export-${Date.now()}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setState('done');
      toast.success('Export scaricato correttamente');
    } catch {
      clearInterval(interval);
      setState('error');
      toast.error('Errore di rete');
    }
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center gap-3'>
        <DatabaseZap className='w-6 h-6 text-blue-500' />
        <div>
          <h1 className='text-2xl font-semibold'>Portabilità dei dati</h1>
          <p className='text-sm text-muted-foreground'>EU Data Act Art. 20 · GDPR Art. 20</p>
        </div>
      </div>

      <AppleCard>
        <AppleCardHeader title='Esporta tutti i dati' />
        <AppleCardContent>
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              Scarica un archivio ZIP con tutti i dati del tuo tenant in formato machine-readable
              (JSON). Includi clienti, veicoli, fatture e prenotazioni. Il file è firmato HMAC per
              garantirne l&apos;integrità.
            </p>

            <ul className='text-sm space-y-1 text-muted-foreground list-disc list-inside'>
              <li>customers.json — anagrafica con PII decifrata</li>
              <li>vehicles.json — veicoli registrati</li>
              <li>invoices.json — fatture emesse</li>
              <li>bookings.json — prenotazioni</li>
              <li>manifest.json — metadati + firma HMAC</li>
            </ul>

            {state === 'loading' && (
              <div className='space-y-2'>
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>Generazione in corso...</span>
                  <span>{progress}%</span>
                </div>
                <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                  <div
                    className='h-2 bg-blue-500 rounded-full transition-all duration-500'
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {state === 'done' && (
              <div className='flex items-center gap-2 text-sm text-green-600'>
                <CheckCircle className='w-4 h-4' />
                <span>Export completato e scaricato</span>
              </div>
            )}

            {state === 'error' && (
              <div className='flex items-center gap-2 text-sm text-red-600'>
                <AlertCircle className='w-4 h-4' />
                <span>Errore durante l&apos;export. Riprova.</span>
              </div>
            )}

            <AppleButton
              variant='primary'
              onClick={handleExport}
              disabled={state === 'loading'}
              className='w-full'
            >
              <Download className='w-4 h-4 mr-2' />
              {state === 'loading' ? 'Generazione ZIP...' : 'Esporta tutti i dati'}
            </AppleButton>
          </div>
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}
