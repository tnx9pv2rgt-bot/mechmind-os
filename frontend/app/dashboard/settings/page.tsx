'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
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
  Smartphone,
  Key,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useTenantSettings,
  useSaveSettings,
  useMfaStatus,
  useMfaEnroll,
  useMfaVerify,
  useChangePassword,
} from '@/hooks/useApi';

const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useTenantSettings();
  const saveSettings = useSaveSettings();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        name: formData.name || settings?.name,
        email: formData.email || settings?.email,
        phone: formData.phone || settings?.phone,
        vatNumber: formData.vatNumber || settings?.vatNumber,
        address: formData.address || settings?.address,
      });
      setSaved(true);
      toast.success('Impostazioni salvate');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Errore nel salvataggio delle impostazioni');
    }
  };

  return (
    <div>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5'>
          <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Impostazioni</h1>
          <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
            Gestisci le preferenze della tua officina
          </p>
        </div>
      </header>

      <div className='p-8 max-w-4xl'>
        <Tabs defaultValue='general' className='w-full'>
          <TabsList className='grid w-full grid-cols-5 mb-8 bg-white dark:bg-[#2f2f2f] p-1 rounded-2xl border border-apple-border/30 dark:border-[#424242]'>
            <TabsTrigger
              value='general'
              className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white'
            >
              Generali
            </TabsTrigger>
            <TabsTrigger
              value='team'
              className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white'
            >
              Team
            </TabsTrigger>
            <TabsTrigger
              value='notifications'
              className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white'
            >
              Notifiche
            </TabsTrigger>
            <TabsTrigger
              value='billing'
              className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white'
            >
              Fatturazione
            </TabsTrigger>
            <TabsTrigger
              value='security'
              className='rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white'
            >
              Sicurezza
            </TabsTrigger>
          </TabsList>

          {/* ─── General ─── */}
          <TabsContent value='general' className='mt-0'>
            <motion.div initial='initial' animate='animate' variants={cardVariants}>
              <AppleCard>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Store className='h-5 w-5 text-apple-blue' />
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                      Informazioni Officina
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                        Nome Officina
                      </label>
                      <Input
                        value={formData.name ?? settings?.name ?? ''}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder={settingsLoading ? 'Caricamento...' : 'Nome officina'}
                        className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                        Email
                      </label>
                      <Input
                        value={formData.email ?? settings?.email ?? ''}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        type='email'
                        className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                        Telefono
                      </label>
                      <Input
                        value={formData.phone ?? settings?.phone ?? ''}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                        className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                        Partita IVA
                      </label>
                      <Input
                        value={formData.vatNumber ?? settings?.vatNumber ?? ''}
                        onChange={e => setFormData(p => ({ ...p, vatNumber: e.target.value }))}
                        className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                      Indirizzo
                    </label>
                    <Input
                      value={formData.address ?? settings?.address ?? ''}
                      onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                      className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
                    />
                  </div>
                  <AppleButton
                    onClick={handleSave}
                    disabled={saveSettings.isPending}
                    className='mt-4'
                  >
                    {saved ? (
                      <CheckCircle className='h-4 w-4 mr-2' />
                    ) : saveSettings.isPending ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : (
                      <Save className='h-4 w-4 mr-2' />
                    )}
                    {saved
                      ? 'Salvato!'
                      : saveSettings.isPending
                        ? 'Salvataggio...'
                        : 'Salva Modifiche'}
                  </AppleButton>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* ─── Team ─── */}
          <TabsContent value='team' className='mt-0'>
            <motion.div initial='initial' animate='animate' variants={cardVariants}>
              <AppleCard>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Users className='h-5 w-5 text-apple-blue' />
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                      Membri Team
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {settingsLoading ? (
                    <div className='space-y-3'>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-4 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] animate-pulse'
                        >
                          <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-[#424242]' />
                          <div className='flex-1'>
                            <div className='w-32 h-4 bg-gray-200 dark:bg-[#424242] rounded mb-2' />
                            <div className='w-40 h-3 bg-gray-200 dark:bg-[#424242] rounded' />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      className='space-y-3'
                      variants={staggerContainer}
                      initial='initial'
                      animate='animate'
                    >
                      {(settings?.team || []).map(member => (
                        <motion.div
                          key={member.id}
                          className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]'
                          variants={staggerItem}
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-10 h-10 rounded-full bg-apple-blue flex items-center justify-center text-white text-sm font-medium'>
                              {member.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                                {member.name}
                              </p>
                              <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <span className='text-xs font-bold uppercase px-3 py-1 rounded-full bg-white dark:bg-[#2f2f2f] border border-apple-border dark:border-[#424242] text-apple-dark dark:text-[#ececec]'>
                            {member.role}
                          </span>
                        </motion.div>
                      ))}
                      {(!settings?.team || settings.team.length === 0) && (
                        <p className='text-center py-8 text-apple-gray dark:text-[#636366]'>
                          Nessun membro del team configurato
                        </p>
                      )}
                    </motion.div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* ─── Notifications ─── */}
          <TabsContent value='notifications' className='mt-0'>
            <motion.div initial='initial' animate='animate' variants={cardVariants}>
              <AppleCard>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <Bell className='h-5 w-5 text-apple-blue' />
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                      Notifiche
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div
                    className='space-y-3'
                    variants={staggerContainer}
                    initial='initial'
                    animate='animate'
                  >
                    {[
                      'Nuove prenotazioni',
                      'Promemoria appuntamenti',
                      'Ricambi in esaurimento',
                      'Pagamenti ricevuti',
                      'Review clienti',
                    ].map(item => (
                      <motion.label
                        key={item}
                        className='flex items-center gap-4 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] cursor-pointer hover:bg-white dark:hover:bg-[#353535] transition-colors'
                        variants={staggerItem}
                      >
                        <input
                          type='checkbox'
                          defaultChecked
                          className='w-5 h-5 rounded-lg border-apple-border text-apple-blue focus:ring-apple-blue'
                        />
                        <span className='text-body text-apple-dark dark:text-[#ececec]'>
                          {item}
                        </span>
                      </motion.label>
                    ))}
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          {/* ─── Billing ─── */}
          <TabsContent value='billing' className='mt-0'>
            <BillingSettingsTab />
          </TabsContent>

          {/* ─── Security ─── */}
          <TabsContent value='security' className='mt-0 space-y-6'>
            <PasswordSection />
            <MfaSection />
            <PasskeySection />
            <DangerZone />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Password Section ───
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
    <motion.div initial='initial' animate='animate' variants={cardVariants}>
      <AppleCard>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Shield className='h-5 w-5 text-apple-blue' />
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
              Cambia Password
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
              Password attuale
            </label>
            <Input
              type='password'
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder='••••••••'
              className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
              Nuova password
            </label>
            <Input
              type='password'
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder='••••••••'
              className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
              Conferma password
            </label>
            <Input
              type='password'
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder='••••••••'
              className='h-12 rounded-xl border-apple-border dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec]'
            />
          </div>
          {message && (
            <div
              className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}
            >
              {message.text}
            </div>
          )}
          <AppleButton onClick={handleChangePassword} disabled={changePassword.isPending}>
            {changePassword.isPending ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : null}
            Cambia Password
          </AppleButton>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// ─── MFA Section ───
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
    <motion.div initial='initial' animate='animate' variants={cardVariants}>
      <AppleCard>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Smartphone className='h-5 w-5 text-apple-purple' />
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
              Autenticazione a due fattori (2FA)
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          {isLoading ? (
            <div className='h-20 flex items-center justify-center'>
              <Loader2 className='h-6 w-6 animate-spin text-apple-gray' />
            </div>
          ) : mfaStatus?.enabled ? (
            <div className='flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl'>
              <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-400' />
              <div>
                <p className='text-body font-medium text-green-800 dark:text-green-300'>
                  2FA Attivo
                </p>
                <p className='text-footnote text-green-600 dark:text-green-400'>
                  Il tuo account è protetto con autenticazione a due fattori.
                </p>
              </div>
            </div>
          ) : enrollData ? (
            <div className='space-y-4'>
              <p className='text-body text-apple-gray dark:text-[#636366]'>
                Scansiona il QR code con la tua app di autenticazione (Google Authenticator, Authy,
                etc.):
              </p>
              {enrollData.qrCodeUrl && (
                <div className='flex justify-center p-4 bg-white dark:bg-[#2f2f2f] rounded-xl border border-apple-border dark:border-[#424242]'>
                  <img src={enrollData.qrCodeUrl} alt='QR Code MFA' className='w-48 h-48' />
                </div>
              )}
              <div className='p-3 bg-apple-light-gray dark:bg-[#353535] rounded-xl'>
                <p className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1'>
                  Chiave manuale
                </p>
                <p className='text-body font-mono text-apple-dark dark:text-[#ececec] select-all'>
                  {enrollData.secret}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-footnote text-apple-gray dark:text-[#636366] font-medium'>
                  Codice di verifica (6 cifre)
                </label>
                <div className='flex gap-3'>
                  <Input
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder='000000'
                    maxLength={6}
                    className='h-12 rounded-xl border-apple-border text-center text-lg tracking-[0.5em] font-mono'
                  />
                  <AppleButton
                    onClick={handleVerify}
                    disabled={verifyCode.length !== 6 || mfaVerify.isPending}
                  >
                    {mfaVerify.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      'Verifica'
                    )}
                  </AppleButton>
                </div>
              </div>
              {enrollData.backupCodes?.length > 0 && (
                <div className='p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl'>
                  <p className='text-sm font-medium text-amber-800 dark:text-amber-300 mb-2'>
                    Codici di recupero (salva in un posto sicuro):
                  </p>
                  <div className='grid grid-cols-2 gap-1'>
                    {enrollData.backupCodes.map((code, i) => (
                      <code key={i} className='text-sm text-amber-700 font-mono'>
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
                Aggiungi un ulteriore livello di sicurezza al tuo account con l&apos;autenticazione
                a due fattori.
              </p>
              <AppleButton onClick={handleEnroll} disabled={mfaEnroll.isPending}>
                {mfaEnroll.isPending ? (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <Smartphone className='h-4 w-4 mr-2' />
                )}
                Attiva 2FA
              </AppleButton>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// ─── Passkey Section ───
function PasskeySection() {
  return (
    <motion.div initial='initial' animate='animate' variants={cardVariants}>
      <AppleCard>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <Key className='h-5 w-5 text-apple-green' />
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
              Passkey (WebAuthn)
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
            Accedi in modo sicuro con Face ID, Touch ID o la chiave di sicurezza del tuo
            dispositivo.
          </p>
          <AppleButton variant='secondary'>
            <Key className='h-4 w-4 mr-2' />
            Registra Passkey
          </AppleButton>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// ─── Danger Zone ───
function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { user, logout } = useAuth();

  const expectedText = 'ELIMINA ACCOUNT';
  const canDelete = confirmText === expectedText;

  return (
    <motion.div initial='initial' animate='animate' variants={cardVariants}>
      <AppleCard className='border-2 border-red-200 dark:border-red-700/30'>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <AlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400' />
            <h2 className='text-title-2 font-semibold text-red-800 dark:text-red-300'>
              Zona Pericolosa
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          {!showConfirm ? (
            <div>
              <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
                L&apos;eliminazione dell&apos;account è permanente. Tutti i dati verranno cancellati
                in conformità con il GDPR.
              </p>
              <AppleButton
                variant='ghost'
                className='text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className='h-4 w-4 mr-2' />
                Elimina account
              </AppleButton>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-xl'>
                <p className='text-sm text-red-700 dark:text-red-300'>
                  Stai per eliminare permanentemente l&apos;account <strong>{user?.email}</strong> e
                  tutti i dati associati. Questa azione non può essere annullata.
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-caption text-apple-gray dark:text-[#636366] uppercase tracking-wider'>
                  Digita <strong>{expectedText}</strong> per confermare
                </label>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={expectedText}
                  className='h-12 rounded-xl border-2 border-red-200 dark:border-red-700/30 focus:border-red-500 focus:ring-red-100'
                />
              </div>
              <div className='flex gap-3'>
                <AppleButton
                  variant='secondary'
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                >
                  Annulla
                </AppleButton>
                <AppleButton
                  className='bg-red-600 hover:bg-red-700'
                  disabled={!canDelete}
                  onClick={() => logout()}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Elimina definitivamente
                </AppleButton>
              </div>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

// ─── Billing Tab ───
function BillingSettingsTab() {
  const router = useRouter();

  return (
    <motion.div initial='initial' animate='animate' variants={cardVariants}>
      <AppleCard>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <CreditCard className='h-5 w-5 text-apple-blue' />
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
              Piano e Pagamenti
            </h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <div className='p-6 rounded-2xl bg-gradient-to-r from-apple-blue to-apple-purple text-white mb-6'>
            <p className='text-footnote text-white/80 mb-1'>Gestione completa</p>
            <h3 className='text-title-1 font-bold mb-2'>Fatturazione e Abbonamento</h3>
            <p className='text-body text-white/80'>
              Gestisci il tuo piano, metodi di pagamento e visualizza le fatture
            </p>
          </div>
          <AppleButton variant='secondary' onClick={() => router.push('/dashboard/billing')}>
            Gestisci Abbonamento
            <ArrowRight className='w-4 h-4 ml-2' />
          </AppleButton>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}
