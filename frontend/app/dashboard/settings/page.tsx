'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Users,
  Bell,
  CreditCard,
  Shield,
  Save,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Key,
  AlertTriangle,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  useTenantSettings,
  useSaveSettings,
  useMfaStatus,
  useMfaEnroll,
  useMfaVerify,
  useChangePassword,
} from '@/hooks/useApi';


const settingsSchema = z.object({
  name: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 2, 'Il nome deve avere almeno 2 caratteri'),
  email: z
    .string()
    .optional()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Formato email non valido'),
  phone: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 6, 'Numero di telefono non valido'),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
});

type SettingsErrors = Partial<Record<keyof z.infer<typeof settingsSchema>, string>>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useTenantSettings();
  const saveSettings = useSaveSettings();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});

  const notifItems = [
    { key: 'newBookings', label: 'Nuove prenotazioni' },
    { key: 'appointmentReminders', label: 'Promemoria appuntamenti' },
    { key: 'lowStockParts', label: 'Ricambi in esaurimento' },
    { key: 'paymentsReceived', label: 'Pagamenti ricevuti' },
    { key: 'customerReviews', label: 'Review clienti' },
  ] as const;

  type NotifKey = (typeof notifItems)[number]['key'];
  const [notifPrefs, setNotifPrefs] = useState<Record<NotifKey, boolean>>({
    newBookings: true,
    appointmentReminders: true,
    lowStockParts: true,
    paymentsReceived: true,
    customerReviews: true,
  });
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  const handleSaveNotifications = async () => {
    setIsSavingNotifs(true);
    try {
      await saveSettings.mutateAsync({ notificationPreferences: notifPrefs });
      toast.success('Preferenze notifiche salvate');
    } catch {
      toast.error('Errore nel salvataggio delle preferenze notifiche');
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const handleSave = async () => {
    setSettingsErrors({});
    const dataToValidate = {
      name: formData.name || settings?.name,
      email: formData.email || settings?.email,
      phone: formData.phone || settings?.phone,
      vatNumber: formData.vatNumber || settings?.vatNumber,
      address: formData.address || settings?.address,
    };
    const result = settingsSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: SettingsErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SettingsErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setSettingsErrors(fieldErrors);
      return;
    }
    try {
      await saveSettings.mutateAsync(dataToValidate);
      setSaved(true);
      toast.success('Impostazioni salvate');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Errore nel salvataggio delle impostazioni');
    }
  };

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <Link
              href='/dashboard'
              className='flex items-center justify-center w-10 h-10 rounded-xl transition-colors hover:bg-[var(--surface-primary)]/5 dark:hover:bg-[var(--surface-secondary)]/5'
            >
              <ArrowLeft className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' />
            </Link>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Impostazioni
              </h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Gestisci le preferenze della tua officina
              </p>
            </div>
          </div>
        </div>
      </header>

      <motion.div className='p-6 lg:p-8 max-w-4xl space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        <Tabs defaultValue='general' className='w-full'>
          <TabsList
            className='grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-8 p-1 rounded-2xl border bg-[var(--surface-elevated)] border-[var(--border-default)]'
          >
            {[
              { value: 'general', label: 'Generali' },
              { value: 'team', label: 'Team' },
              { value: 'notifications', label: 'Notifiche' },
              { value: 'billing', label: 'Fatturazione' },
              { value: 'security', label: 'Sicurezza' },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='rounded-xl text-sm text-[var(--text-secondary)] data-[state=active]:bg-[var(--surface-secondary)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-sm'
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General */}
          <TabsContent value='general' className='mt-0'>
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Store className='h-5 w-5 text-[var(--brand)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Informazioni Officina
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <label htmlFor='settingsName' className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          Nome Officina
                        </label>
                        <Input
                          id='settingsName'
                          value={formData.name ?? settings?.name ?? ''}
                          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                          placeholder={settingsLoading ? 'Caricamento...' : 'Nome officina'}
                          className='h-12 rounded-xl'
                        />
                        {settingsErrors.name && (
                          <p className='text-footnote text-[var(--status-error)]'>{settingsErrors.name}</p>
                        )}
                      </div>
                      <div className='space-y-2'>
                        <label htmlFor='settingsEmail' className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          Email
                        </label>
                        <Input
                          id='settingsEmail'
                          value={formData.email ?? settings?.email ?? ''}
                          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                          type='email'
                          className='h-12 rounded-xl'
                        />
                        {settingsErrors.email && (
                          <p className='text-footnote text-[var(--status-error)]'>{settingsErrors.email}</p>
                        )}
                      </div>
                      <div className='space-y-2'>
                        <label htmlFor='settingsPhone' className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          Telefono
                        </label>
                        <Input
                          id='settingsPhone'
                          value={formData.phone ?? settings?.phone ?? ''}
                          onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                          className='h-12 rounded-xl'
                        />
                        {settingsErrors.phone && (
                          <p className='text-footnote text-[var(--status-error)]'>{settingsErrors.phone}</p>
                        )}
                      </div>
                      <div className='space-y-2'>
                        <label htmlFor='settingsVatNumber' className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          Partita IVA
                        </label>
                        <Input
                          id='settingsVatNumber'
                          value={formData.vatNumber ?? settings?.vatNumber ?? ''}
                          onChange={e => setFormData(p => ({ ...p, vatNumber: e.target.value }))}
                          className='h-12 rounded-xl'
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor='settingsAddress' className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                        Indirizzo
                      </label>
                      <Input
                        id='settingsAddress'
                        value={formData.address ?? settings?.address ?? ''}
                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                        className='h-12 rounded-xl'
                      />
                    </div>
                    <AppleButton
                      onClick={handleSave}
                      loading={saveSettings.isPending}
                      icon={saved ? <CheckCircle className='h-4 w-4' /> : <Save className='h-4 w-4' />}
                    >
                      {saved
                        ? 'Salvato!'
                        : saveSettings.isPending
                          ? 'Salvataggio...'
                          : 'Salva Modifiche'}
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* Team */}
          <TabsContent value='team' className='mt-0'>
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Users className='h-5 w-5 text-[var(--brand)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Membri Team
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {settingsLoading ? (
                    <div className='flex items-center justify-center py-12'>
                      <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                    </div>
                  ) : (
                    <motion.div
                      className='space-y-3'
                      variants={containerVariants}
                      initial='hidden'
                      animate='visible'
                    >
                      {(settings?.team || []).map((member, index) => (
                        <motion.div
                          key={member.id}
                          className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                          variants={listItemVariants}
                          custom={index}
                          whileHover={{ scale: 1.005, x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-[var(--brand)] text-[var(--text-on-brand)]'>
                              {member.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {member.name}
                              </p>
                              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <span className='text-footnote font-medium px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            {member.role}
                          </span>
                        </motion.div>
                      ))}
                      {(!settings?.team || settings.team.length === 0) && (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                          <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                          <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            Nessun membro del team configurato
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value='notifications' className='mt-0'>
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Bell className='h-5 w-5 text-[var(--brand)]' />
                    <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Notifiche
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div
                    className='space-y-3'
                    variants={containerVariants}
                    initial='hidden'
                    animate='visible'
                  >
                    {notifItems.map((item, index) => (
                      <motion.label
                        key={item.key}
                        className='flex items-center gap-4 p-4 rounded-2xl cursor-pointer bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                      >
                        <input
                          type='checkbox'
                          checked={notifPrefs[item.key]}
                          onChange={e =>
                            setNotifPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className='w-5 h-5 rounded-lg accent-blue-500'
                        />
                        <span className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {item.label}
                        </span>
                      </motion.label>
                    ))}
                  </motion.div>
                  <div className='mt-6'>
                    <AppleButton
                      onClick={handleSaveNotifications}
                      loading={isSavingNotifs}
                      icon={<Save className='h-4 w-4' />}
                    >
                      {isSavingNotifs ? 'Salvataggio...' : 'Salva Preferenze Notifiche'}
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* Billing */}
          <TabsContent value='billing' className='mt-0'>
            <BillingSettingsTab />
          </TabsContent>

          {/* Security */}
          <TabsContent value='security' className='mt-0 space-y-6'>
            <PasswordSection />
            <MfaSection />
            <PasskeySection />

            {/* Link to advanced security settings */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-xl bg-[var(--brand)] flex items-center justify-center'>
                        <Shield className='h-5 w-5 text-[var(--text-on-brand)]' />
                      </div>
                      <div>
                        <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Sicurezza avanzata
                        </p>
                        <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          Dispositivi fidati, telefono di recupero, verifica SMS e log attivita
                        </p>
                      </div>
                    </div>
                    <Link href='/dashboard/settings/security'>
                      <AppleButton icon={<ArrowRight className='h-4 w-4' />}>
                        Gestisci
                      </AppleButton>
                    </Link>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <DangerZone />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

// Password Section
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const changePassword = useChangePassword();

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La password deve essere di almeno 8 caratteri' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password cambiata con successo' });
      toast.success('Password cambiata con successo');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Errore nel cambio password. Verifica la password attuale.');
      setMessage({
        type: 'error',
        text: 'Errore nel cambio password. Verifica la password attuale.',
      });
    }
  };

  return (
    <motion.div variants={listItemVariants}>
      <AppleCard hover={false}>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Shield className='h-5 w-5 text-[var(--brand)]' />
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Cambia Password
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Password attuale
              </label>
              <Input
                type='password'
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder='--------'
                className='h-12 rounded-xl'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Nuova password
              </label>
              <Input
                type='password'
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder='--------'
                className='h-12 rounded-xl'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Conferma password
              </label>
              <Input
                type='password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder='--------'
                className='h-12 rounded-xl'
              />
            </div>
            {message && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  message.type === 'success'
                    ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)] border border-[var(--status-success)]/30 dark:border-[var(--status-success)]'
                    : 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]'
                }`}
              >
                {message.text}
              </div>
            )}
            <AppleButton
              onClick={handleChangePassword}
              loading={changePassword.isPending}
            >
              Cambia Password
            </AppleButton>
          </div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// MFA Section
function MfaSection() {
  const { data: mfaStatus, isLoading } = useMfaStatus();
  const mfaEnroll = useMfaEnroll();
  const mfaVerify = useMfaVerify();
  const [verifyCode, setVerifyCode] = useState('');
  const [enrollData, setEnrollData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);

  const handleEnroll = async () => {
    try {
      const data = await mfaEnroll.mutateAsync();
      setEnrollData(data);
    } catch {
      toast.error("Errore nell'attivazione 2FA");
    }
  };

  const handleVerify = async () => {
    try {
      await mfaVerify.mutateAsync({ code: verifyCode });
      toast.success('2FA attivato con successo');
      setEnrollData(null);
      setVerifyCode('');
    } catch {
      toast.error('Codice di verifica non valido');
    }
  };

  return (
    <motion.div variants={listItemVariants}>
      <AppleCard hover={false}>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Smartphone className='h-5 w-5 text-[var(--brand)]' />
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Autenticazione a due fattori (2FA)
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
            </div>
          ) : mfaStatus?.enabled ? (
            <div className='flex items-center gap-3 p-4 rounded-xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] border border-[var(--status-success)]/30 dark:border-[var(--status-success)]'>
              <CheckCircle className='h-5 w-5 text-[var(--status-success)] dark:text-[var(--status-success)]' />
              <div>
                <p className='text-body font-medium text-[var(--status-success)] dark:text-[var(--status-success)]'>
                  2FA Attivo
                </p>
                <p className='text-footnote text-[var(--status-success)] dark:text-[var(--status-success)]'>
                  Il tuo account e protetto con autenticazione a due fattori.
                </p>
              </div>
            </div>
          ) : enrollData ? (
            <div className='space-y-4'>
              <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Scansiona il QR code con la tua app di autenticazione (Google Authenticator, Authy,
                etc.):
              </p>
              {enrollData.qrCodeUrl && (
                <div className='flex justify-center p-4 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] border border-[var(--border-default)]/20 dark:border-[var(--border-default)]'>
                  <Image
                    src={enrollData.qrCodeUrl}
                    alt='QR Code per configurazione autenticazione a due fattori'
                    className='w-48 h-48'
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
              )}
              <div className='p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'>
                <p className='text-footnote mb-1 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Chiave manuale
                </p>
                <p className='text-body font-mono select-all text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  {enrollData.secret}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Codice di verifica (6 cifre)
                </label>
                <div className='flex gap-3'>
                  <Input
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder='000000'
                    maxLength={6}
                    className='h-12 rounded-xl text-center text-lg tracking-[0.5em] font-mono'
                  />
                  <AppleButton
                    onClick={handleVerify}
                    disabled={verifyCode.length !== 6}
                    loading={mfaVerify.isPending}
                  >
                    Verifica
                  </AppleButton>
                </div>
              </div>
              {enrollData.backupCodes?.length > 0 && (
                <div className='p-4 rounded-xl bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)] border border-[var(--status-warning)]/20 dark:border-[var(--status-warning)]'>
                  <p className='text-body font-medium mb-2 text-[var(--status-warning)] dark:text-[var(--status-warning)]'>
                    Codici di recupero (salva in un posto sicuro):
                  </p>
                  <div className='grid grid-cols-2 gap-1'>
                    {enrollData.backupCodes.map((code, i) => (
                      <code key={i} className='text-sm font-mono text-[var(--status-warning)] dark:text-[var(--status-warning)]'>
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className='text-body mb-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Aggiungi un ulteriore livello di sicurezza al tuo account con l&apos;autenticazione
                a due fattori.
              </p>
              <AppleButton
                onClick={handleEnroll}
                loading={mfaEnroll.isPending}
                icon={<Smartphone className='h-4 w-4' />}
              >
                Attiva 2FA
              </AppleButton>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// Passkey Section
function PasskeySection() {
  return (
    <motion.div variants={listItemVariants}>
      <AppleCard hover={false}>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Key className='h-5 w-5 text-[var(--status-success)]' />
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Passkey (WebAuthn)
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <p className='text-body mb-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
            Accedi in modo sicuro con Face ID, Touch ID o la chiave di sicurezza del tuo
            dispositivo.
          </p>
          <AppleButton
            variant='secondary'
            icon={<Key className='h-4 w-4' />}
          >
            Registra Passkey
          </AppleButton>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// Danger Zone
function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, logout } = useAuth();

  const expectedText = 'ELIMINA ACCOUNT';
  const canDelete = confirmText === expectedText;

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: { message: 'Errore eliminazione account' } }));
        throw new Error(data.error?.message || `Errore: ${res.status}`);
      }
      toast.success('Richiesta di eliminazione account inviata');
      await logout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione dell'account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div variants={listItemVariants}>
      <AppleCard hover={false} className='ring-2 ring-apple-red/30'>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <AlertTriangle className='h-5 w-5 text-[var(--status-error)]' />
            <h2 className='text-title-2 font-semibold text-[var(--status-error)]'>
              Zona Pericolosa
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          {!showConfirm ? (
            <div>
              <p className='text-body mb-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                L&apos;eliminazione dell&apos;account e permanente. Tutti i dati verranno cancellati
                in conformita con il GDPR.
              </p>
              <AppleButton
                variant='ghost'
                className='text-[var(--status-error)]'
                icon={<Trash2 className='h-4 w-4' />}
                onClick={() => setShowConfirm(true)}
              >
                Elimina account
              </AppleButton>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='p-4 rounded-xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]'>
                <p className='text-body text-[var(--status-error)] dark:text-[var(--status-error)]'>
                  Stai per eliminare permanentemente l&apos;account <strong>{user?.email}</strong> e
                  tutti i dati associati. Questa azione non puo essere annullata.
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Digita <strong>{expectedText}</strong> per confermare
                </label>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={expectedText}
                  className='h-12 rounded-xl ring-2 ring-apple-red/30'
                />
              </div>
              <div className='flex gap-3'>
                <AppleButton
                  variant='secondary'
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  Annulla
                </AppleButton>
                <AppleButton
                  variant='primary'
                  className='bg-[var(--status-error)] hover:bg-[var(--status-error)]'
                  disabled={!canDelete}
                  loading={isDeleting}
                  icon={<Trash2 className='h-4 w-4' />}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? 'Eliminazione in corso...' : 'Elimina definitivamente'}
                </AppleButton>
              </div>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// Billing Tab
function BillingSettingsTab() {
  const router = useRouter();

  return (
    <motion.div variants={listItemVariants}>
      <AppleCard hover={false}>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <CreditCard className='h-5 w-5 text-[var(--brand)]' />
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Piano e Pagamenti
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <div className='p-6 rounded-2xl mb-6 bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'>
            <p className='text-footnote mb-1 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Gestione completa
            </p>
            <h3 className='text-title-1 font-bold mb-2 text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Fatturazione e Abbonamento
            </h3>
            <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Gestisci il tuo piano, metodi di pagamento e visualizza le fatture
            </p>
          </div>
          <AppleButton
            variant='secondary'
            icon={<ArrowRight className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/billing')}
          >
            Gestisci Abbonamento
          </AppleButton>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}
