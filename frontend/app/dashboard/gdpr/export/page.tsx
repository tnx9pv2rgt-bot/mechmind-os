'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  ArrowLeft,
  FileArchive,
  Database,
  FileText,
  Clock,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

type ExportStatus = 'idle' | 'preparing' | 'collecting' | 'generating' | 'ready' | 'error';

const STEPS: { id: ExportStatus; label: string; icon: typeof Database }[] = [
  { id: 'preparing', label: 'Preparazione', icon: Clock },
  { id: 'collecting', label: 'Raccolta dati', icon: Database },
  { id: 'generating', label: 'Generazione file', icon: FileText },
  { id: 'ready', label: 'Pronto', icon: CheckCircle },
];

export default function GdprExportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  const startExport = async () => {
    setStatus('preparing');
    setError('');
    try {
      const res = await fetch('/api/gdpr/export', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error?.message || 'Errore avvio esportazione');
      }
      const data = await res.json();
      const rid = data.data?.requestId || data.requestId;
      setRequestId(rid);
      setEstimatedTime(data.data?.estimatedTime || data.estimatedTime || 'Pochi minuti');
      setStatus('collecting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore avvio esportazione');
      setStatus('error');
      toast.error('Errore durante l\'avvio dell\'esportazione');
    }
  };

  const checkStatus = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await fetch(`/api/gdpr/export?requestId=${requestId}`);
      if (!res.ok) return;
      const data = await res.json();
      const currentStatus = data.data?.status || data.status;
      if (currentStatus === 'COLLECTING') setStatus('collecting');
      else if (currentStatus === 'GENERATING') setStatus('generating');
      else if (currentStatus === 'READY' || currentStatus === 'COMPLETED') {
        setStatus('ready');
        const url = data.data?.downloadUrl || data.downloadUrl;
        setDownloadUrl(url || null);
      } else if (currentStatus === 'ERROR' || currentStatus === 'FAILED') {
        setStatus('error');
        setError(data.data?.error || 'Errore durante l\'esportazione');
      }
    } catch {
      // Polling silently ignores transient errors
    }
  }, [requestId]);

  useEffect(() => {
    if (status !== 'collecting' && status !== 'generating' && status !== 'preparing') return;
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [status, checkStatus]);

  const currentStepIndex = STEPS.findIndex(s => s.id === status);

  return (
    <div>
      <header className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Impostazioni', href: '/dashboard/settings' },
              { label: 'Esportazione Dati (GDPR)' },
            ]}
          />
          <div className="flex items-center gap-4 mt-2">
            <AppleButton
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.back()}
            >
              Indietro
            </AppleButton>
            <div>
              <h1 className="text-headline text-apple-dark dark:text-[#ececec]">
                Esportazione Dati
              </h1>
              <p className="text-apple-gray dark:text-[#636366] text-body mt-1">
                Esporta tutti i tuoi dati personali (Art. 20 GDPR)
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-apple-blue flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                    Diritto alla Portabilita dei Dati
                  </h2>
                  <p className="text-footnote text-apple-gray dark:text-[#636366]">
                    Ai sensi dell&apos;Art. 20 del GDPR
                  </p>
                </div>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {status === 'idle' && (
                <div className="space-y-4">
                  <p className="text-sm text-apple-gray dark:text-[#636366]">
                    Puoi richiedere una copia completa di tutti i dati personali associati al tuo
                    account. Il file sara disponibile in formato ZIP contenente:
                  </p>
                  <ul className="text-sm text-apple-gray dark:text-[#636366] space-y-2 pl-4">
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-apple-blue" />
                      Dati del profilo e dell&apos;account
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-apple-blue" />
                      Fatture e documenti fiscali
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-apple-blue" />
                      Ordini di lavoro e ispezioni
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-apple-blue" />
                      Comunicazioni e notifiche
                    </li>
                  </ul>
                  <AppleButton onClick={startExport} icon={<Download className="h-4 w-4" />}>
                    Richiedi Esportazione Dati
                  </AppleButton>
                </div>
              )}

              {(status === 'preparing' || status === 'collecting' || status === 'generating') && (
                <div className="space-y-6">
                  {/* Progress steps */}
                  <div className="flex items-center justify-between">
                    {STEPS.map((step, i) => {
                      const StepIcon = step.icon;
                      const isActive = i === currentStepIndex;
                      const isDone = i < currentStepIndex;
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          {i > 0 && (
                            <div
                              className={`h-0.5 w-8 sm:w-12 ${
                                isDone ? 'bg-apple-green' : 'bg-gray-200 dark:bg-[#424242]'
                              }`}
                            />
                          )}
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                isActive
                                  ? 'bg-apple-blue text-white'
                                  : isDone
                                  ? 'bg-apple-green text-white'
                                  : 'bg-gray-100 dark:bg-[#353535] text-apple-gray'
                              }`}
                            >
                              {isActive ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : isDone ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <StepIcon className="h-5 w-5" />
                              )}
                            </div>
                            <span className="text-[10px] text-apple-gray dark:text-[#636366] text-center whitespace-nowrap">
                              {step.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-apple-blue mx-auto mb-3" />
                    <p className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                      Esportazione in corso...
                    </p>
                    {estimatedTime && (
                      <p className="text-xs text-apple-gray dark:text-[#636366] mt-1">
                        Tempo stimato: {estimatedTime}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {status === 'ready' && (
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-apple-green flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-apple-dark dark:text-[#ececec]">
                    I tuoi dati sono pronti!
                  </h3>
                  <p className="text-sm text-apple-gray dark:text-[#636366]">
                    Il file ZIP e pronto per il download. Il link sara disponibile per 24 ore.
                  </p>
                  <AppleButton
                    onClick={() => {
                      if (downloadUrl) window.open(downloadUrl, '_blank');
                      else toast.error('URL di download non disponibile');
                    }}
                    icon={<FileArchive className="h-4 w-4" />}
                  >
                    Scarica i tuoi Dati
                  </AppleButton>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error || 'Si e verificato un errore durante l\'esportazione'}
                  </p>
                  <AppleButton variant="secondary" onClick={startExport}>
                    Riprova
                  </AppleButton>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </div>
    </div>
  );
}
