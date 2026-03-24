'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { btnPrimary, btnSpinner } from '@/components/auth/auth-styles';
import { OTPInput } from '@/components/auth/otp-input';

export function MFASetupPageClient(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEnroll = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
      const data = (await res.json()) as {
        qrCode?: string;
        secret?: string;
        manualEntryKey?: string;
        error?: string;
      };
      if (res.ok && data.qrCode) {
        setQrCode(data.qrCode);
        setSecret(data.secret || data.manualEntryKey || '');
        setStep(2);
      } else {
        setError(data.error || 'Errore durante la configurazione');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (): Promise<void> => {
    if (verificationCode.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode }),
      });
      const data = (await res.json()) as {
        verified?: boolean;
        backupCodes?: string[];
        error?: string;
      };
      if (res.ok && data.verified) {
        setBackupCodes(data.backupCodes || []);
        setStep(3);
      } else {
        setError(data.error || 'Codice non valido. Riprova.');
        setVerificationCode('');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (verificationCode.length === 6 && !isLoading && step === 2) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationCode]);

  const copySecret = (): void => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = (): void => {
    const content = [
      'MechMind OS - Codici di backup per autenticazione a due fattori',
      '================================================================',
      '',
      'Conserva questi codici in un posto sicuro.',
      'Ogni codice può essere usato una sola volta.',
      '',
      ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generati il: ${new Date().toLocaleDateString('it-IT', { dateStyle: 'full' })}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mechmind-codici-backup.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthSplitLayout
      showBack={step < 3}
      onBack={() => (step === 1 ? router.push('/dashboard') : setStep(step - 1))}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Introduction */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 mb-4">
                <span className="text-2xl text-white">🛡</span>
              </div>
              <h1 className="text-[28px] font-normal text-white tracking-tight">
                Configura 2FA
              </h1>
              <p className="mt-2 text-[15px] text-[#b4b4b4] leading-relaxed">
                Aggiungi un livello di sicurezza al tuo account
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#4e4e4e]">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-xl text-[#b4b4b4]">📱</span>
              </div>
              <div>
                <p className="font-medium text-white text-[15px]">
                  App Authenticator
                </p>
                <p className="text-[13px] text-[#888]">
                  Google Authenticator, Authy o 1Password
                </p>
              </div>
            </div>

            <button
              onClick={handleEnroll}
              disabled={isLoading}
              className={btnPrimary}
            >
              {isLoading ? <span className={btnSpinner} /> : 'Inizia configurazione'}
            </button>

            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[13px] text-[#b4b4b4]"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Step 2: QR Code + Verify */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h1 className="text-[28px] font-normal text-white tracking-tight">
                Scansiona il QR Code
              </h1>
              <p className="mt-2 text-[15px] text-[#b4b4b4] leading-relaxed">
                Usa la tua app authenticator per scansionare
              </p>
            </div>

            {qrCode && (
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-white">
                  <Image
                    src={qrCode}
                    alt="QR Code per configurazione MFA"
                    className="w-48 h-48"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
              </div>
            )}

            {/* Manual key */}
            <div className="flex items-center gap-2 p-3 rounded-2xl border border-[#4e4e4e]">
              <code className="text-[13px] flex-1 font-mono text-white break-all">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0 text-[13px] text-[#b4b4b4]"
                aria-label="Copia codice segreto"
              >
                {copied ? '✓' : 'Copia'}
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[13px] text-[#888] text-center">
                Inserisci il codice a 6 cifre per verificare
              </p>
              <OTPInput
                length={6}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[13px] text-[#b4b4b4]"
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={handleVerify}
              disabled={isLoading || verificationCode.length !== 6}
              className={btnPrimary}
            >
              {isLoading ? <span className={btnSpinner} /> : 'Verifica'}
            </button>
          </motion.div>
        )}

        {/* Step 3: Backup codes */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 mb-4">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h1 className="text-[28px] font-normal text-white tracking-tight">
                2FA attivato!
              </h1>
              <p className="mt-2 text-[15px] text-[#b4b4b4] leading-relaxed">
                Il tuo account è ora protetto
              </p>
            </div>

            {/* Backup codes */}
            <div className="p-5 rounded-2xl border border-[#4e4e4e]">
              <div className="flex items-center gap-2 text-white mb-3">
                <span className="text-lg">⚠</span>
                <span className="font-semibold text-[15px]">Codici di backup</span>
              </div>
              <p className="text-[13px] text-[#888] mb-4 leading-relaxed">
                Salva questi codici in un posto sicuro. Ogni codice può essere usato una sola
                volta se perdi l&apos;accesso all&apos;app authenticator.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="text-[13px] bg-white/5 p-2 rounded-xl font-mono text-center text-white"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <button
                onClick={downloadBackupCodes}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#4e4e4e] text-white h-[44px] text-[14px] font-medium hover:bg-white/5 transition-colors"
              >
                Scarica codici di backup
              </button>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className={btnPrimary}
            >
              Vai alla dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthSplitLayout>
  );
}
