'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  CheckCircle,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { OTPInput } from '@/components/auth/otp-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface RecoveryPhoneSetupProps {
  currentPhone: string | null;
  isVerified: boolean;
  onSetPhone: (phone: string) => Promise<void>;
  onVerifyPhone: (code: string) => Promise<void>;
  onRemovePhone: () => Promise<void>;
  onRefresh: () => void;
}

type SetupStep = 'display' | 'input' | 'verify';

export function RecoveryPhoneSetup({
  currentPhone,
  isVerified,
  onSetPhone,
  onVerifyPhone,
  onRemovePhone,
  onRefresh,
}: RecoveryPhoneSetupProps): React.ReactElement {
  const [step, setStep] = useState<SetupStep>(currentPhone ? 'display' : 'input');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleSendCode = async (): Promise<void> => {
    if (!phone.trim() || phone.length < 8) {
      setError('Inserisci un numero di telefono valido');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onSetPhone(phone);
      toast.success('Codice inviato via SMS');
      setStep('verify');
    } catch {
      setError('Errore nell\'invio del codice. Verifica il numero.');
      toast.error('Errore nell\'invio del codice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (code?: string): Promise<void> => {
    const codeToVerify = code || otpCode;
    if (codeToVerify.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      await onVerifyPhone(codeToVerify);
      toast.success('Telefono di recupero verificato');
      onRefresh();
      setStep('display');
      setOtpCode('');
    } catch {
      setError('Codice non valido. Riprova.');
      toast.error('Codice non valido');
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await onRemovePhone();
      toast.success('Telefono di recupero rimosso');
      onRefresh();
      setStep('input');
      setPhone('');
      setOtpCode('');
    } catch {
      toast.error('Errore nella rimozione del telefono');
    } finally {
      setIsLoading(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* NIST Warning */}
      <div className="flex items-start gap-2 rounded-xl bg-[var(--status-warning)]/100/10 px-4 py-3 text-xs text-[var(--status-warning)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>NIST:</strong> SMS è un metodo limitato. Usa passkey o app authenticator come metodo principale.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step: Display verified phone */}
        {step === 'display' && currentPhone && isVerified && (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-xl bg-[var(--status-success-subtle)]0/10 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-[var(--status-success)]" />
              <div>
                <p className="text-sm font-medium text-[var(--status-success)]">Verificato</p>
                <p className="text-xs text-[var(--status-success)]/70">{currentPhone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setPhone('');
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)]/30 hover:text-[var(--text-on-brand)]"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--status-error)]/30 px-4 py-2 text-xs font-medium text-[var(--status-error)] transition-colors hover:border-[var(--status-error)]/50 hover:bg-[var(--status-error-subtle)]0/5"
              >
                <X className="h-3 w-3" />
                Rimuovi
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Phone input */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <div className="flex h-[52px] w-20 items-center justify-center rounded-l-full border border-r-0 border-[var(--border-strong)] bg-[var(--surface-elevated)] text-sm text-[var(--text-secondary)]">
                +39
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
                placeholder="333 123 4567"
                className="h-[52px] flex-1 rounded-r-full border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 text-base text-[var(--text-on-brand)] placeholder-[var(--text-tertiary)] outline-none transition-colors"
                aria-label="Numero di telefono"
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={isLoading || phone.length < 8}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--surface-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-active)] disabled:opacity-30"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              Invia codice
            </button>
            {currentPhone && (
              <button
                type="button"
                onClick={() => setStep('display')}
                className="min-h-[44px] w-full text-center text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)]"
              >
                Annulla
              </button>
            )}
          </motion.div>
        )}

        {/* Step: OTP verification */}
        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <p className="text-center text-sm text-[var(--text-secondary)]">
              Inserisci il codice a 6 cifre inviato al +39 {phone}
            </p>
            <OTPInput
              length={6}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isLoading}
              onComplete={handleVerify}
            />
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isLoading || otpCode.length !== 6}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--surface-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-active)] disabled:opacity-30"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verifica'}
            </button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                className="min-h-[44px] text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)]"
              >
                Rinvia codice
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setOtpCode('');
                  setError('');
                }}
                className="min-h-[44px] text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-on-brand)]"
              >
                Cambia numero
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-[var(--status-error)]"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Rimuovi telefono di recupero"
        description="Non potrai più usare SMS come metodo di recupero o verifica. Se perdi accesso all'app authenticator, potresti non riuscire a recuperare il tuo account."
        confirmLabel="Rimuovi"
        variant="danger"
        onConfirm={handleRemove}
        loading={isLoading}
      />
    </div>
  );
}
