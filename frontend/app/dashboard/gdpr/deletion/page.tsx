'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Users,
  Car,
  MessageSquare,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

const DELETED_ITEMS = [
  { icon: Users, label: 'Account e profilo utente' },
  { icon: FileText, label: 'Fatture e documenti fiscali' },
  { icon: Car, label: 'Veicoli e ordini di lavoro' },
  { icon: CreditCard, label: 'Dati di pagamento' },
  { icon: MessageSquare, label: 'Comunicazioni e notifiche' },
  { icon: Shield, label: 'Log di accesso e audit' },
];

export default function GdprDeletionPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isConfirmValid = confirmation === 'ELIMINA';
  const canSubmit = password.length > 0 && isConfirmValid && !submitting;

  const handleDelete = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/gdpr/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || data.error?.message || 'Errore nella richiesta di eliminazione',
        );
      }

      setSuccess(true);
      toast.success('Richiesta di eliminazione account inviata');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nella richiesta';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Impostazioni', href: '/dashboard/settings' },
              { label: 'Eliminazione Account (GDPR)' },
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
              <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Eliminazione Account
              </h1>
              <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
                Diritto alla cancellazione (Art. 17 GDPR)
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="text-center space-y-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-[var(--brand)] flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-[var(--text-on-brand)]" />
                  </div>
                  <h3 className="text-headline font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Richiesta Ricevuta
                  </h3>
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] max-w-md mx-auto">
                    La tua richiesta di eliminazione e stata registrata. Il tuo account sara
                    eliminato entro 30 giorni. Durante questo periodo puoi annullare la richiesta
                    accedendo al tuo account.
                  </p>
                  <div className="pt-4">
                    <AppleButton
                      variant="secondary"
                      onClick={() => router.push('/dashboard')}
                    >
                      Torna alla Dashboard
                    </AppleButton>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        ) : (
          <>
            {/* Warning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]">
                <AlertTriangle className="h-6 w-6 text-[var(--status-error)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-body font-semibold text-[var(--status-error)] dark:text-[var(--status-error)] mb-1">
                    Questa azione e irreversibile
                  </h3>
                  <p className="text-body text-[var(--status-error)] dark:text-[var(--status-error)]">
                    Una volta confermata, tutti i tuoi dati personali saranno eliminati
                    permanentemente dopo un periodo di grazia di 30 giorni. Non sara possibile
                    recuperare i dati dopo l&apos;eliminazione.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* What will be deleted */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Cosa verra eliminato
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DELETED_ITEMS.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--status-error-subtle)]/50 dark:bg-[var(--status-error)]/40/10"
                        >
                          <XCircle className="h-4 w-4 text-[var(--status-error)] flex-shrink-0" />
                          <ItemIcon className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                          <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Confirmation Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className="text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Conferma Eliminazione
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className="space-y-5">
                    {error && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]">
                        <AlertCircle className="h-4 w-4 text-[var(--status-error)] flex-shrink-0" />
                        <p className="text-body text-[var(--status-error)] dark:text-[var(--status-error)]">{error}</p>
                      </div>
                    )}

                    <div>
                      <Label className="mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        Password attuale
                      </Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Inserisci la tua password"
                        className="rounded-xl"
                        autoComplete="current-password"
                      />
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        Digita <span className="font-bold text-[var(--status-error)]">ELIMINA</span> per confermare
                      </Label>
                      <Input
                        value={confirmation}
                        onChange={e => setConfirmation(e.target.value)}
                        placeholder="Digita ELIMINA"
                        className={`rounded-xl ${
                          confirmation.length > 0 && !isConfirmValid
                            ? 'border-[var(--status-error)]/30 focus:ring-[var(--status-error)]/20'
                            : ''
                        }`}
                        autoComplete="off"
                      />
                      {confirmation.length > 0 && !isConfirmValid && (
                        <p className="text-footnote text-[var(--status-error)] mt-1">
                          Devi digitare esattamente &quot;ELIMINA&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/10 border border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]">
                      <AlertTriangle className="h-4 w-4 text-[var(--status-warning)] flex-shrink-0" />
                      <p className="text-footnote text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                        Periodo di grazia: 30 giorni. Puoi annullare la richiesta accedendo al tuo
                        account entro questo periodo.
                      </p>
                    </div>

                    <AppleButton
                      onClick={handleDelete}
                      disabled={!canSubmit}
                      loading={submitting}
                      icon={<Trash2 className="h-4 w-4" />}
                      className="w-full bg-[var(--status-error)] hover:bg-[var(--status-error)] text-[var(--text-on-brand)] disabled:opacity-50"
                    >
                      Elimina il mio Account
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
