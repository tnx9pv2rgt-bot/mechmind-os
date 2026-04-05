'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import {
  User,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  AlertTriangle,
  Mail,
  Smartphone,
  MessageCircle,
  CheckCircle,
  Car,
  Plus,
  X,
  Download,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalPageWrapper, usePortalCustomer } from '@/components/portal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NotificationPreferences, CustomerVehicle } from '@/lib/types/portal';
import { toast } from 'sonner';
import { z } from 'zod';

const profileSchema = z.object({
  firstName: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 2, 'Il nome deve avere almeno 2 caratteri'),
  lastName: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 2, 'Il cognome deve avere almeno 2 caratteri'),
  email: z
    .string()
    .optional()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Formato email non valido'),
  phone: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 6, 'Numero di telefono non valido'),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Inserisci la password attuale'),
    new: z.string().min(8, 'La nuova password deve avere almeno 8 caratteri'),
    confirm: z.string().min(1, 'Conferma la nuova password'),
  })
  .refine(data => data.new === data.confirm, {
    message: 'Le password non coincidono',
    path: ['confirm'],
  });

type ProfileErrors = Partial<Record<keyof z.infer<typeof profileSchema>, string>>;
type PasswordErrors = Partial<Record<'current' | 'new' | 'confirm', string>>;

const vehicleSchema = z.object({
  make: z.string().min(1, 'Inserisci la marca'),
  model: z.string().min(1, 'Inserisci il modello'),
  year: z.number().min(1970, 'Anno non valido').max(new Date().getFullYear() + 1, 'Anno non valido'),
  licensePlate: z.string().min(2, 'Targa non valida'),
  vin: z.string().optional(),
  mileage: z.number().min(0, 'Chilometraggio non valido').optional(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'lpg']),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;
type VehicleErrors = Partial<Record<keyof VehicleFormData, string>>;

const fuelTypeLabels: Record<string, string> = {
  petrol: 'Benzina',
  diesel: 'Diesel',
  electric: 'Elettrico',
  hybrid: 'Ibrido',
  lpg: 'GPL',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalSettingsPage() {
  const { customer, isLoading: customerLoading } = usePortalCustomer();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  // Vehicle state
  const {
    data: vehiclesData,
    mutate: mutateVehicles,
  } = useSWR<{ data: CustomerVehicle[] }>('/api/portal/vehicles', fetcher);
  const vehicles = vehiclesData?.data || [];
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>({
    make: '', model: '', year: new Date().getFullYear(), licensePlate: '', fuelType: 'petrol',
  });
  const [vehicleErrors, setVehicleErrors] = useState<VehicleErrors>({});
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null);
  const [deleteVehicleOpen, setDeleteVehicleOpen] = useState(false);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password form
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: {
      enabled: true,
      bookingReminders: true,
      maintenanceAlerts: true,
      inspectionReports: true,
      promotions: false,
      newsletter: false,
    },
    sms: {
      enabled: true,
      bookingReminders: true,
      urgentAlerts: true,
    },
    whatsapp: {
      enabled: false,
      bookingReminders: false,
      statusUpdates: false,
    },
    push: {
      enabled: true,
      all: true,
    },
  });

  useEffect(() => {
    if (!customerLoading) {
      if (customer) {
        setProfile({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
        });
      }
      setIsLoading(false);
    }
  }, [customer, customerLoading]);

  const handleSaveProfile = async () => {
    setProfileErrors({});
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const fieldErrors: ProfileErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProfileErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setProfileErrors(fieldErrors);
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Errore salvataggio profilo');
      setSaveSuccess(true);
      toast.success('Profilo aggiornato con successo');
    } catch {
      toast.error('Errore nel salvataggio del profilo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordErrors({});
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      const fieldErrors: PasswordErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof PasswordErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setPasswordErrors(fieldErrors);
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.new,
        }),
      });
      if (!res.ok) throw new Error('Errore cambio password');
      setPassword({ current: '', new: '', confirm: '' });
      setSaveSuccess(true);
      toast.success('Password aggiornata con successo');
    } catch {
      toast.error('Errore nel cambio password');
    } finally {
      setIsSaving(false);
    }
  };

  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const auth = (await import('@/lib/auth/portal-auth-client')).PortalAuthService.getInstance();
      const token = auth.getToken();

      const res = await fetch('/api/portal/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(notifications),
      });
      if (!res.ok) throw new Error('Errore salvataggio preferenze notifiche');
      toast.success('Preferenze notifiche salvate');
    } catch {
      toast.error('Errore nel salvataggio delle preferenze notifiche');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Inserisci la password per confermare l'eliminazione");
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const auth = (await import('@/lib/auth/portal-auth-client')).PortalAuthService.getInstance();
      const token = auth.getToken();

      const res = await fetch('/api/portal/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: { message: 'Errore eliminazione account' } }));
        throw new Error(data.error?.message || `Errore: ${res.status}`);
      }

      toast.success('Account eliminato con successo');
      // Clear auth state and redirect to portal login
      auth.logout();
      window.location.href = '/portal/login';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione dell'account");
      setDeleteError(
        err instanceof Error ? err.message : "Errore durante l'eliminazione dell'account"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddVehicle = async (): Promise<void> => {
    setVehicleErrors({});
    const result = vehicleSchema.safeParse(vehicleForm);
    if (!result.success) {
      const fieldErrors: VehicleErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof VehicleErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setVehicleErrors(fieldErrors);
      return;
    }
    setIsSavingVehicle(true);
    try {
      const res = await fetch('/api/portal/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm),
      });
      if (!res.ok) throw new Error('Errore aggiunta veicolo');
      await mutateVehicles();
      setShowAddVehicle(false);
      setVehicleForm({ make: '', model: '', year: new Date().getFullYear(), licensePlate: '', fuelType: 'petrol' });
      toast.success('Veicolo aggiunto con successo');
    } catch {
      toast.error('Errore nell\'aggiunta del veicolo');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (): Promise<void> => {
    if (!deleteVehicleId) return;
    setIsDeletingVehicle(true);
    try {
      const res = await fetch(`/api/portal/vehicles?id=${deleteVehicleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione veicolo');
      await mutateVehicles();
      toast.success('Veicolo rimosso');
    } catch {
      toast.error('Errore nella rimozione del veicolo');
    } finally {
      setIsDeletingVehicle(false);
      setDeleteVehicleId(null);
    }
  };

  const handleExportData = async (): Promise<void> => {
    setIsExportingData(true);
    try {
      const res = await fetch('/api/portal/account?action=export', { method: 'GET' });
      if (!res.ok) throw new Error('Errore esportazione dati');
      toast.success('Richiesta di esportazione dati inviata. Riceverai un\'email con il link per il download.');
    } catch {
      toast.error('Errore nella richiesta di esportazione');
    } finally {
      setIsExportingData(false);
    }
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Impostazioni' customer={customer || undefined}>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  return (
    <PortalPageWrapper
      title='Impostazioni'
      subtitle='Gestisci il tuo profilo e le preferenze'
      customer={customer || undefined}
    >
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className='mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl flex items-center gap-3'
        >
          <CheckCircle className='h-5 w-5 text-apple-green flex-shrink-0' />
          <p className='text-sm text-apple-green font-medium'>Modifiche salvate con successo!</p>
        </motion.div>
      )}

      <Tabs defaultValue='profile' className='w-full'>
        <TabsList className='w-full sm:w-auto mb-6 flex-wrap'>
          <TabsTrigger value='profile' className='flex items-center gap-2'>
            <User className='h-4 w-4' />
            <span className='hidden sm:inline'>Profilo</span>
          </TabsTrigger>
          <TabsTrigger value='vehicles' className='flex items-center gap-2'>
            <Car className='h-4 w-4' />
            <span className='hidden sm:inline'>Veicoli</span>
          </TabsTrigger>
          <TabsTrigger value='password' className='flex items-center gap-2'>
            <Lock className='h-4 w-4' />
            <span className='hidden sm:inline'>Password</span>
          </TabsTrigger>
          <TabsTrigger value='notifications' className='flex items-center gap-2'>
            <Bell className='h-4 w-4' />
            <span className='hidden sm:inline'>Notifiche</span>
          </TabsTrigger>
          <TabsTrigger value='privacy' className='flex items-center gap-2'>
            <Shield className='h-4 w-4' />
            <span className='hidden sm:inline'>Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value='profile'>
          <AppleCard>
            <AppleCardHeader>
              <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                <User className='h-5 w-5 text-apple-blue' />
                Informazioni Personali
              </h2>
            </AppleCardHeader>
            <AppleCardContent className='p-6'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='firstName'>Nome</Label>
                  <Input
                    id='firstName'
                    value={profile.firstName}
                    onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {profileErrors.firstName && (
                    <p className='text-xs text-apple-red'>{profileErrors.firstName}</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='lastName'>Cognome</Label>
                  <Input
                    id='lastName'
                    value={profile.lastName}
                    onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {profileErrors.lastName && (
                    <p className='text-xs text-apple-red'>{profileErrors.lastName}</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {profileErrors.email && (
                    <p className='text-xs text-apple-red'>{profileErrors.email}</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Telefono</Label>
                  <Input
                    id='phone'
                    type='tel'
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {profileErrors.phone && (
                    <p className='text-xs text-apple-red'>{profileErrors.phone}</p>
                  )}
                </div>
              </div>
              <div className='mt-6 flex justify-end'>
                <AppleButton
                  onClick={handleSaveProfile}
                  loading={isSaving}
                  icon={<Save className='h-4 w-4' />}
                >
                  Salva Modifiche
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value='vehicles'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                I tuoi veicoli
              </h2>
              <AppleButton
                size='sm'
                icon={<Plus className='h-4 w-4' />}
                onClick={() => setShowAddVehicle(!showAddVehicle)}
              >
                Aggiungi veicolo
              </AppleButton>
            </div>

            {/* Add Vehicle Form */}
            {showAddVehicle && (
              <AppleCard>
                <AppleCardHeader>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-base font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      Nuovo Veicolo
                    </h3>
                    <button
                      onClick={() => setShowAddVehicle(false)}
                      className='p-1 rounded-lg hover:bg-apple-light-gray dark:hover:bg-[var(--surface-hover)]'
                    >
                      <X className='h-4 w-4 text-apple-gray' />
                    </button>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className='p-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='v-make'>Marca *</Label>
                      <Input
                        id='v-make'
                        value={vehicleForm.make}
                        onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                        placeholder='es. Fiat'
                        className='h-12 rounded-xl'
                      />
                      {vehicleErrors.make && <p className='text-xs text-apple-red'>{vehicleErrors.make}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='v-model'>Modello *</Label>
                      <Input
                        id='v-model'
                        value={vehicleForm.model}
                        onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                        placeholder='es. Panda'
                        className='h-12 rounded-xl'
                      />
                      {vehicleErrors.model && <p className='text-xs text-apple-red'>{vehicleErrors.model}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='v-year'>Anno *</Label>
                      <Input
                        id='v-year'
                        type='number'
                        value={vehicleForm.year}
                        onChange={e => setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value) || 0 })}
                        className='h-12 rounded-xl'
                      />
                      {vehicleErrors.year && <p className='text-xs text-apple-red'>{vehicleErrors.year}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='v-plate'>Targa *</Label>
                      <Input
                        id='v-plate'
                        value={vehicleForm.licensePlate}
                        onChange={e => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value.toUpperCase() })}
                        placeholder='es. AB123CD'
                        className='h-12 rounded-xl'
                      />
                      {vehicleErrors.licensePlate && <p className='text-xs text-apple-red'>{vehicleErrors.licensePlate}</p>}
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='v-vin'>VIN (opzionale)</Label>
                      <Input
                        id='v-vin'
                        value={vehicleForm.vin || ''}
                        onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                        placeholder='Numero di telaio'
                        className='h-12 rounded-xl'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='v-mileage'>Chilometraggio</Label>
                      <Input
                        id='v-mileage'
                        type='number'
                        value={vehicleForm.mileage || ''}
                        onChange={e => setVehicleForm({ ...vehicleForm, mileage: parseInt(e.target.value) || 0 })}
                        placeholder='km'
                        className='h-12 rounded-xl'
                      />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                      <Label htmlFor='v-fuel'>Alimentazione *</Label>
                      <div className='flex flex-wrap gap-2'>
                        {(['petrol', 'diesel', 'electric', 'hybrid', 'lpg'] as const).map(ft => (
                          <button
                            key={ft}
                            type='button'
                            onClick={() => setVehicleForm({ ...vehicleForm, fuelType: ft })}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              vehicleForm.fuelType === ft
                                ? 'bg-apple-blue text-white'
                                : 'bg-apple-light-gray dark:bg-[var(--surface-hover)] text-apple-dark dark:text-[var(--text-primary)]'
                            }`}
                          >
                            {fuelTypeLabels[ft]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className='mt-6 flex justify-end gap-2'>
                    <AppleButton variant='ghost' onClick={() => setShowAddVehicle(false)}>
                      Annulla
                    </AppleButton>
                    <AppleButton
                      onClick={handleAddVehicle}
                      loading={isSavingVehicle}
                      icon={<Save className='h-4 w-4' />}
                    >
                      Salva Veicolo
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            )}

            {/* Vehicle List */}
            {vehicles.length === 0 && !showAddVehicle ? (
              <AppleCard>
                <AppleCardContent className='text-center py-12'>
                  <Car className='h-12 w-12 text-apple-gray/30 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2'>
                    Nessun veicolo registrato
                  </h3>
                  <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
                    Aggiungi i tuoi veicoli per gestire prenotazioni e manutenzione.
                  </p>
                  <AppleButton
                    icon={<Plus className='h-4 w-4' />}
                    onClick={() => setShowAddVehicle(true)}
                  >
                    Aggiungi il primo veicolo
                  </AppleButton>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <div className='space-y-3'>
                {vehicles.map((vehicle) => (
                  <AppleCard key={vehicle.id}>
                    <AppleCardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center'>
                            <Car className='h-6 w-6 text-apple-blue' />
                          </div>
                          <div>
                            <p className='font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                              {vehicle.make} {vehicle.model} ({vehicle.year})
                            </p>
                            <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                              {vehicle.licensePlate}
                              {vehicle.mileage ? ` — ${vehicle.mileage.toLocaleString('it-IT')} km` : ''}
                              {' — '}{fuelTypeLabels[vehicle.fuelType] || vehicle.fuelType}
                            </p>
                          </div>
                        </div>
                        <AppleButton
                          variant='ghost'
                          size='sm'
                          className='text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20'
                          onClick={() => {
                            setDeleteVehicleId(vehicle.id);
                            setDeleteVehicleOpen(true);
                          }}
                        >
                          <Trash2 className='h-4 w-4' />
                        </AppleButton>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                ))}
              </div>
            )}
          </div>
          <ConfirmDialog
            open={deleteVehicleOpen}
            onOpenChange={setDeleteVehicleOpen}
            title='Rimuovi veicolo'
            description='Sei sicuro di voler rimuovere questo veicolo? Questa azione non può essere annullata.'
            confirmLabel='Rimuovi'
            variant='danger'
            onConfirm={handleDeleteVehicle}
            loading={isDeletingVehicle}
          />
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value='password'>
          <AppleCard>
            <AppleCardHeader>
              <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                <Lock className='h-5 w-5 text-apple-blue' />
                Cambia Password
              </h2>
            </AppleCardHeader>
            <AppleCardContent className='p-6'>
              <div className='space-y-4 max-w-md'>
                <div className='space-y-2'>
                  <Label htmlFor='currentPassword'>Password Attuale</Label>
                  <Input
                    id='currentPassword'
                    type='password'
                    value={password.current}
                    onChange={e => setPassword({ ...password, current: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {passwordErrors.current && (
                    <p className='text-xs text-apple-red'>{passwordErrors.current}</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='newPassword'>Nuova Password</Label>
                  <Input
                    id='newPassword'
                    type='password'
                    value={password.new}
                    onChange={e => setPassword({ ...password, new: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {passwordErrors.new && (
                    <p className='text-xs text-apple-red'>{passwordErrors.new}</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword'>Conferma Nuova Password</Label>
                  <Input
                    id='confirmPassword'
                    type='password'
                    value={password.confirm}
                    onChange={e => setPassword({ ...password, confirm: e.target.value })}
                    className='h-12 rounded-xl'
                  />
                  {passwordErrors.confirm && (
                    <p className='text-xs text-apple-red'>{passwordErrors.confirm}</p>
                  )}
                </div>
              </div>
              <div className='mt-6 flex justify-end'>
                <AppleButton
                  onClick={handleSavePassword}
                  loading={isSaving}
                  disabled={!password.current || !password.new || password.new !== password.confirm}
                >
                  Aggiorna Password
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value='notifications'>
          <div className='space-y-4'>
            {/* Email Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <Mail className='h-5 w-5 text-apple-blue' />
                  <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Email
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      Notifiche email
                    </p>
                    <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                      Ricevi aggiornamenti via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email.enabled}
                    onCheckedChange={checked =>
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, enabled: checked },
                      })
                    }
                  />
                </div>
                {notifications.email.enabled && (
                  <div className='pl-4 border-l-2 border-apple-border dark:border-[var(--border-default)] space-y-3'>
                    <label className='flex items-center gap-3'>
                      <input
                        type='checkbox'
                        checked={notifications.email.bookingReminders}
                        onChange={e =>
                          setNotifications({
                            ...notifications,
                            email: { ...notifications.email, bookingReminders: e.target.checked },
                          })
                        }
                        className='rounded border-apple-border'
                      />
                      <span className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                        Promemoria prenotazioni
                      </span>
                    </label>
                    <label className='flex items-center gap-3'>
                      <input
                        type='checkbox'
                        checked={notifications.email.maintenanceAlerts}
                        onChange={e =>
                          setNotifications({
                            ...notifications,
                            email: { ...notifications.email, maintenanceAlerts: e.target.checked },
                          })
                        }
                        className='rounded border-apple-border'
                      />
                      <span className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                        Avvisi manutenzione
                      </span>
                    </label>
                    <label className='flex items-center gap-3'>
                      <input
                        type='checkbox'
                        checked={notifications.email.inspectionReports}
                        onChange={e =>
                          setNotifications({
                            ...notifications,
                            email: { ...notifications.email, inspectionReports: e.target.checked },
                          })
                        }
                        className='rounded border-apple-border'
                      />
                      <span className='text-sm text-apple-dark dark:text-[var(--text-primary)]'>
                        Report ispezioni
                      </span>
                    </label>
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>

            {/* SMS Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <Smartphone className='h-5 w-5 text-apple-green' />
                  <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>SMS</h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>Notifiche SMS</p>
                    <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                      Ricevi messaggi urgenti
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms.enabled}
                    onCheckedChange={checked =>
                      setNotifications({
                        ...notifications,
                        sms: { ...notifications.sms, enabled: checked },
                      })
                    }
                  />
                </div>
              </AppleCardContent>
            </AppleCard>

            {/* WhatsApp Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <MessageCircle className='h-5 w-5 text-apple-green' />
                  <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    WhatsApp
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      Notifiche WhatsApp
                    </p>
                    <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                      Ricevi aggiornamenti su WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={notifications.whatsapp.enabled}
                    onCheckedChange={checked =>
                      setNotifications({
                        ...notifications,
                        whatsapp: { ...notifications.whatsapp, enabled: checked },
                      })
                    }
                  />
                </div>
              </AppleCardContent>
            </AppleCard>

            <div className='flex justify-end'>
              <AppleButton
                onClick={handleSaveNotifications}
                loading={isSavingNotifications}
                icon={<Save className='h-4 w-4' />}
              >
                Salva Preferenze
              </AppleButton>
            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value='privacy'>
          <div className='space-y-4'>
            {/* Data Export */}
            <AppleCard>
              <AppleCardHeader>
                <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                  <Download className='h-5 w-5 text-apple-blue' />
                  Esportazione Dati (GDPR)
                </h2>
              </AppleCardHeader>
              <AppleCardContent className='p-6'>
                <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
                  Ai sensi del GDPR, puoi richiedere una copia completa di tutti i tuoi dati personali.
                  Riceverai un link per il download via email.
                </p>
                <AppleButton
                  variant='secondary'
                  onClick={handleExportData}
                  loading={isExportingData}
                  icon={<Download className='h-4 w-4' />}
                >
                  Richiedi esportazione dati
                </AppleButton>
              </AppleCardContent>
            </AppleCard>

            {/* 2FA */}
            <AppleCard>
              <AppleCardHeader>
                <h2 className='text-lg font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                  <Shield className='h-5 w-5 text-apple-blue' />
                  Autenticazione a Due Fattori
                </h2>
              </AppleCardHeader>
              <AppleCardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      2FA non attivo
                    </p>
                    <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)]'>
                      Aggiungi un livello di sicurezza extra
                    </p>
                  </div>
                  <AppleButton variant='secondary' size='sm'>
                    Attiva
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>

            {/* Delete Account */}
            <AppleCard className='border-red-200'>
              <AppleCardHeader>
                <h2 className='text-lg font-semibold text-apple-red flex items-center gap-2'>
                  <Trash2 className='h-5 w-5' />
                  Elimina Account
                </h2>
              </AppleCardHeader>
              <AppleCardContent className='p-6'>
                <div className='flex items-start gap-4'>
                  <AlertTriangle className='h-5 w-5 text-apple-red flex-shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                      L&apos;eliminazione dell&apos;account è irreversibile. Tutti i tuoi dati
                      verranno cancellati in conformità con il GDPR.
                    </p>
                    <div className='space-y-3 max-w-md'>
                      <div className='space-y-2'>
                        <Label htmlFor='deletePassword'>Conferma con la tua password</Label>
                        <Input
                          id='deletePassword'
                          type='password'
                          placeholder='Inserisci la password per confermare'
                          value={deletePassword}
                          onChange={e => {
                            setDeletePassword(e.target.value);
                            setDeleteError('');
                          }}
                          className='h-12 rounded-xl'
                        />
                        {deleteError && <p className='text-xs text-apple-red'>{deleteError}</p>}
                      </div>
                      <AppleButton
                        variant='ghost'
                        className='text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20'
                        onClick={() => setDeleteAccountOpen(true)}
                        disabled={!deletePassword}
                        loading={isDeleting}
                      >
                        Richiedi eliminazione account
                      </AppleButton>
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title='Elimina account'
        description='Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e tutti i tuoi dati verranno rimossi.'
        confirmLabel='Elimina account'
        variant='danger'
        onConfirm={handleDeleteAccount}
      />
    </PortalPageWrapper>
  );
}
