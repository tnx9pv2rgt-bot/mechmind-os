'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
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
  ArrowLeft,
  Smartphone,
  Key,
  AlertTriangle,
  Trash2,
  Loader2,
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

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const inputStyle: React.CSSProperties = {
  backgroundColor: colors.glowStrong,
  borderColor: colors.borderSubtle,
  color: colors.textPrimary,
};

const labelStyle: React.CSSProperties = {
  color: colors.textTertiary,
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
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 lg:px-8 py-5 flex items-center gap-4'>
          <Link
            href='/dashboard'
            className='flex items-center justify-center w-10 h-10 rounded-xl transition-colors'
            style={{ color: colors.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <div>
            <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
              Impostazioni
            </h1>
            <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
              Gestisci le preferenze della tua officina
            </p>
          </div>
        </div>
      </header>

      <div className='p-6 lg:p-8 max-w-4xl'>
        <Tabs defaultValue='general' className='w-full'>
          <TabsList
            className='grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-8 p-1 rounded-2xl border'
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
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
                className='rounded-xl text-sm data-[state=active]:bg-white data-[state=active]:text-[#1a1a1a] data-[state=active]:shadow-sm'
                style={{ color: colors.textSecondary }}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General */}
          <TabsContent value='general' className='mt-0'>
            <motion.div initial='hidden' animate='visible' variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
                  <Store className='h-5 w-5' style={{ color: colors.info }} />
                  <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
                    Informazioni Officina
                  </h2>
                </div>
                <div className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label htmlFor='settingsName' className='text-[12px] font-medium uppercase tracking-wider' style={labelStyle}>
                        Nome Officina
                      </label>
                      <Input
                        id='settingsName'
                        value={formData.name ?? settings?.name ?? ''}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder={settingsLoading ? 'Caricamento...' : 'Nome officina'}
                        className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
                        style={inputStyle}
                      />
                      {settingsErrors.name && (
                        <p className='text-xs' style={{ color: colors.error }}>{settingsErrors.name}</p>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor='settingsEmail' className='text-[12px] font-medium uppercase tracking-wider' style={labelStyle}>
                        Email
                      </label>
                      <Input
                        id='settingsEmail'
                        value={formData.email ?? settings?.email ?? ''}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        type='email'
                        className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
                        style={inputStyle}
                      />
                      {settingsErrors.email && (
                        <p className='text-xs' style={{ color: colors.error }}>{settingsErrors.email}</p>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor='settingsPhone' className='text-[12px] font-medium uppercase tracking-wider' style={labelStyle}>
                        Telefono
                      </label>
                      <Input
                        id='settingsPhone'
                        value={formData.phone ?? settings?.phone ?? ''}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                        className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
                        style={inputStyle}
                      />
                      {settingsErrors.phone && (
                        <p className='text-xs' style={{ color: colors.error }}>{settingsErrors.phone}</p>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor='settingsVatNumber' className='text-[12px] font-medium uppercase tracking-wider' style={labelStyle}>
                        Partita IVA
                      </label>
                      <Input
                        id='settingsVatNumber'
                        value={formData.vatNumber ?? settings?.vatNumber ?? ''}
                        onChange={e => setFormData(p => ({ ...p, vatNumber: e.target.value }))}
                        className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label htmlFor='settingsAddress' className='text-[12px] font-medium uppercase tracking-wider' style={labelStyle}>
                      Indirizzo
                    </label>
                    <Input
                      id='settingsAddress'
                      value={formData.address ?? settings?.address ?? ''}
                      onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                      className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
                      style={inputStyle}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saveSettings.isPending}
                    className='mt-4 inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
                    style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
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
                  </button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Team */}
          <TabsContent value='team' className='mt-0'>
            <motion.div initial='hidden' animate='visible' variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
                  <Users className='h-5 w-5' style={{ color: colors.info }} />
                  <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
                    Membri Team
                  </h2>
                </div>
                <div className='p-6'>
                  {settingsLoading ? (
                    <div className='space-y-3'>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-4 p-4 rounded-2xl animate-pulse'
                          style={{ backgroundColor: colors.glowStrong }}
                        >
                          <div className='w-10 h-10 rounded-full' style={{ backgroundColor: colors.borderSubtle }} />
                          <div className='flex-1'>
                            <div className='w-32 h-4 rounded mb-2' style={{ backgroundColor: colors.borderSubtle }} />
                            <div className='w-40 h-3 rounded' style={{ backgroundColor: colors.borderSubtle }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      className='space-y-3'
                      variants={staggerContainer}
                      initial='hidden'
                      animate='visible'
                    >
                      {(settings?.team || []).map(member => (
                        <motion.div
                          key={member.id}
                          className='flex items-center justify-between p-4 rounded-2xl transition-colors'
                          style={{ backgroundColor: colors.glowStrong }}
                          variants={staggerItem}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.glowStrong)}
                        >
                          <div className='flex items-center gap-4'>
                            <div
                              className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium'
                              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
                            >
                              {member.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className='text-[14px] font-semibold' style={{ color: colors.textPrimary }}>
                                {member.name}
                              </p>
                              <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <span
                            className='text-xs font-bold uppercase px-3 py-1 rounded-full border'
                            style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
                          >
                            {member.role}
                          </span>
                        </motion.div>
                      ))}
                      {(!settings?.team || settings.team.length === 0) && (
                        <p className='text-center py-8 text-[13px]' style={{ color: colors.textTertiary }}>
                          Nessun membro del team configurato
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value='notifications' className='mt-0'>
            <motion.div initial='hidden' animate='visible' variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
                  <Bell className='h-5 w-5' style={{ color: colors.info }} />
                  <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
                    Notifiche
                  </h2>
                </div>
                <div className='p-6'>
                  <motion.div
                    className='space-y-3'
                    variants={staggerContainer}
                    initial='hidden'
                    animate='visible'
                  >
                    {notifItems.map(item => (
                      <motion.label
                        key={item.key}
                        className='flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors'
                        style={{ backgroundColor: colors.glowStrong }}
                        variants={staggerItem}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.glowStrong)}
                      >
                        <input
                          type='checkbox'
                          checked={notifPrefs[item.key]}
                          onChange={e =>
                            setNotifPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className='w-5 h-5 rounded-lg accent-white'
                        />
                        <span className='text-[14px]' style={{ color: colors.textPrimary }}>
                          {item.label}
                        </span>
                      </motion.label>
                    ))}
                  </motion.div>
                  <div className='mt-6'>
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isSavingNotifs}
                      className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
                      style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
                    >
                      {isSavingNotifs ? (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      ) : (
                        <Save className='h-4 w-4 mr-2' />
                      )}
                      {isSavingNotifs ? 'Salvataggio...' : 'Salva Preferenze Notifiche'}
                    </button>
                  </div>
                </div>
              </div>
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
            <motion.div initial='hidden' animate='visible' variants={itemVariants}>
              <div
                className='rounded-2xl border overflow-hidden'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div className='flex items-center justify-between p-6'>
                  <div className='flex items-center gap-3'>
                    <Shield className='h-5 w-5' style={{ color: colors.info }} />
                    <div>
                      <p className='text-[14px] font-semibold' style={{ color: colors.textPrimary }}>
                        Sicurezza avanzata
                      </p>
                      <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                        Dispositivi fidati, telefono di recupero, verifica SMS e log attivita
                      </p>
                    </div>
                  </div>
                  <a
                    href='/dashboard/settings/security'
                    className='inline-flex min-h-[44px] items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors'
                    style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
                  >
                    Gestisci
                    <ArrowRight className='h-4 w-4' />
                  </a>
                </div>
              </div>
            </motion.div>

            <DangerZone />
          </TabsContent>
        </Tabs>
      </div>
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
    <motion.div initial='hidden' animate='visible' variants={itemVariants}>
      <div
        className='rounded-2xl border overflow-hidden'
        style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
          <Shield className='h-5 w-5' style={{ color: colors.info }} />
          <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
            Cambia Password
          </h2>
        </div>
        <div className='p-6 space-y-4'>
          <div className='space-y-2'>
            <label className='text-[12px] font-medium uppercase tracking-wider' style={{ color: colors.textTertiary }}>
              Password attuale
            </label>
            <Input
              type='password'
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder='--------'
              className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
              style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-[12px] font-medium uppercase tracking-wider' style={{ color: colors.textTertiary }}>
              Nuova password
            </label>
            <Input
              type='password'
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder='--------'
              className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
              style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-[12px] font-medium uppercase tracking-wider' style={{ color: colors.textTertiary }}>
              Conferma password
            </label>
            <Input
              type='password'
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder='--------'
              className='h-12 rounded-xl border focus:border-white/30 focus:outline-none'
              style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
            />
          </div>
          {message && (
            <div
              className='p-3 rounded-xl text-sm'
              style={{
                backgroundColor: message.type === 'success' ? `${colors.success}15` : `${colors.error}15`,
                color: message.type === 'success' ? colors.success : colors.error,
                border: `1px solid ${message.type === 'success' ? colors.success + '33' : colors.error + '33'}`,
              }}
            >
              {message.text}
            </div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={changePassword.isPending}
            className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
            style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
          >
            {changePassword.isPending ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : null}
            Cambia Password
          </button>
        </div>
      </div>
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
    <motion.div initial='hidden' animate='visible' variants={itemVariants}>
      <div
        className='rounded-2xl border overflow-hidden'
        style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
          <Smartphone className='h-5 w-5' style={{ color: colors.purple }} />
          <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
            Autenticazione a due fattori (2FA)
          </h2>
        </div>
        <div className='p-6'>
          {isLoading ? (
            <div className='h-20 flex items-center justify-center'>
              <Loader2 className='h-6 w-6 animate-spin' style={{ color: colors.textTertiary }} />
            </div>
          ) : mfaStatus?.enabled ? (
            <div
              className='flex items-center gap-3 p-4 rounded-xl'
              style={{ backgroundColor: `${colors.success}15`, border: `1px solid ${colors.success}33` }}
            >
              <CheckCircle className='h-5 w-5' style={{ color: colors.success }} />
              <div>
                <p className='text-[14px] font-medium' style={{ color: colors.success }}>
                  2FA Attivo
                </p>
                <p className='text-[13px]' style={{ color: `${colors.success}cc` }}>
                  Il tuo account e protetto con autenticazione a due fattori.
                </p>
              </div>
            </div>
          ) : enrollData ? (
            <div className='space-y-4'>
              <p className='text-[14px]' style={{ color: colors.textSecondary }}>
                Scansiona il QR code con la tua app di autenticazione (Google Authenticator, Authy,
                etc.):
              </p>
              {enrollData.qrCodeUrl && (
                <div
                  className='flex justify-center p-4 rounded-xl border'
                  style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle }}
                >
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
              <div
                className='p-3 rounded-xl'
                style={{ backgroundColor: colors.glowStrong }}
              >
                <p className='text-[11px] uppercase tracking-wider mb-1' style={{ color: colors.textTertiary }}>
                  Chiave manuale
                </p>
                <p className='text-[14px] font-mono select-all' style={{ color: colors.textPrimary }}>
                  {enrollData.secret}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-[12px] font-medium uppercase tracking-wider' style={{ color: colors.textTertiary }}>
                  Codice di verifica (6 cifre)
                </label>
                <div className='flex gap-3'>
                  <Input
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder='000000'
                    maxLength={6}
                    className='h-12 rounded-xl border text-center text-lg tracking-[0.5em] font-mono focus:border-white/30 focus:outline-none'
                    style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifyCode.length !== 6 || mfaVerify.isPending}
                    className='inline-flex items-center h-12 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
                    style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
                  >
                    {mfaVerify.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      'Verifica'
                    )}
                  </button>
                </div>
              </div>
              {enrollData.backupCodes?.length > 0 && (
                <div
                  className='p-4 rounded-xl border'
                  style={{ backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}33` }}
                >
                  <p className='text-sm font-medium mb-2' style={{ color: colors.warning }}>
                    Codici di recupero (salva in un posto sicuro):
                  </p>
                  <div className='grid grid-cols-2 gap-1'>
                    {enrollData.backupCodes.map((code, i) => (
                      <code key={i} className='text-sm font-mono' style={{ color: `${colors.warning}cc` }}>
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className='text-[14px] mb-4' style={{ color: colors.textSecondary }}>
                Aggiungi un ulteriore livello di sicurezza al tuo account con l&apos;autenticazione
                a due fattori.
              </p>
              <button
                onClick={handleEnroll}
                disabled={mfaEnroll.isPending}
                className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
                style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
              >
                {mfaEnroll.isPending ? (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <Smartphone className='h-4 w-4 mr-2' />
                )}
                Attiva 2FA
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Passkey Section
function PasskeySection() {
  return (
    <motion.div initial='hidden' animate='visible' variants={itemVariants}>
      <div
        className='rounded-2xl border overflow-hidden'
        style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
          <Key className='h-5 w-5' style={{ color: colors.success }} />
          <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
            Passkey (WebAuthn)
          </h2>
        </div>
        <div className='p-6'>
          <p className='text-[14px] mb-4' style={{ color: colors.textSecondary }}>
            Accedi in modo sicuro con Face ID, Touch ID o la chiave di sicurezza del tuo
            dispositivo.
          </p>
          <button
            className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors border'
            style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Key className='h-4 w-4 mr-2' />
            Registra Passkey
          </button>
        </div>
      </div>
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
    <motion.div initial='hidden' animate='visible' variants={itemVariants}>
      <div
        className='rounded-2xl overflow-hidden'
        style={{ backgroundColor: colors.surface, border: `2px solid ${colors.error}33` }}
      >
        <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: `${colors.error}22` }}>
          <AlertTriangle className='h-5 w-5' style={{ color: colors.error }} />
          <h2 className='text-[16px] font-semibold' style={{ color: colors.error }}>
            Zona Pericolosa
          </h2>
        </div>
        <div className='p-6'>
          {!showConfirm ? (
            <div>
              <p className='text-[14px] mb-4' style={{ color: colors.textSecondary }}>
                L&apos;eliminazione dell&apos;account e permanente. Tutti i dati verranno cancellati
                in conformita con il GDPR.
              </p>
              <button
                className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors'
                style={{ color: colors.error }}
                onClick={() => setShowConfirm(true)}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${colors.error}15`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 className='h-4 w-4 mr-2' />
                Elimina account
              </button>
            </div>
          ) : (
            <div className='space-y-4'>
              <div
                className='p-4 rounded-xl border'
                style={{ backgroundColor: `${colors.error}10`, borderColor: `${colors.error}33` }}
              >
                <p className='text-sm' style={{ color: colors.error }}>
                  Stai per eliminare permanentemente l&apos;account <strong>{user?.email}</strong> e
                  tutti i dati associati. Questa azione non puo essere annullata.
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-[11px] uppercase tracking-wider' style={{ color: colors.textTertiary }}>
                  Digita <strong>{expectedText}</strong> per confermare
                </label>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={expectedText}
                  className='h-12 rounded-xl focus:outline-none'
                  style={{
                    backgroundColor: colors.glowStrong,
                    color: colors.textPrimary,
                    border: `2px solid ${colors.error}33`,
                  }}
                />
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  disabled={isDeleting}
                  className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors border disabled:opacity-50'
                  style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Annulla
                </button>
                <button
                  disabled={!canDelete || isDeleting}
                  onClick={handleDeleteAccount}
                  className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50'
                  style={{ backgroundColor: colors.error, color: colors.textPrimary }}
                >
                  {isDeleting ? (
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  ) : (
                    <Trash2 className='h-4 w-4 mr-2' />
                  )}
                  {isDeleting ? 'Eliminazione in corso...' : 'Elimina definitivamente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Billing Tab
function BillingSettingsTab() {
  const router = useRouter();

  return (
    <motion.div initial='hidden' animate='visible' variants={itemVariants}>
      <div
        className='rounded-2xl border overflow-hidden'
        style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
      >
        <div className='px-6 py-4 border-b flex items-center gap-3' style={{ borderColor: colors.borderSubtle }}>
          <CreditCard className='h-5 w-5' style={{ color: colors.info }} />
          <h2 className='text-[16px] font-semibold' style={{ color: colors.textPrimary }}>
            Piano e Pagamenti
          </h2>
        </div>
        <div className='p-6'>
          <div
            className='p-6 rounded-2xl mb-6'
            style={{
              background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.borderSubtle} 100%)`,
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <p className='text-[12px] uppercase tracking-wider mb-1' style={{ color: colors.textTertiary }}>
              Gestione completa
            </p>
            <h3 className='text-[20px] font-semibold mb-2' style={{ color: colors.textPrimary }}>
              Fatturazione e Abbonamento
            </h3>
            <p className='text-[14px]' style={{ color: colors.textSecondary }}>
              Gestisci il tuo piano, metodi di pagamento e visualizza le fatture
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/billing')}
            className='inline-flex items-center h-10 px-5 rounded-xl text-sm font-medium transition-colors border'
            style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Gestisci Abbonamento
            <ArrowRight className='w-4 h-4 ml-2' />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
