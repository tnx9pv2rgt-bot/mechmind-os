'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Warehouse,
  Loader2,
  AlertCircle,
  BarChart3,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface LocationDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string | null;
  email: string | null;
  openingHours: Record<string, string> | null;
  bays: { id: string; name: string; type: string; status: string }[];
  technicians: { id: string; firstName: string; lastName: string; role: string }[];
  stats: { totalWo: number; avgCompletionTime: number; revenue: number } | null;
}

type TabId = 'dettagli' | 'bay' | 'tecnici' | 'statistiche';

const editLocationSchema = z.object({
  name: z.string().min(1, 'Il nome della sede è obbligatorio'),
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  city: z.string().min(1, 'La città è obbligatoria'),
  province: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email('Email non valida').or(z.literal('')).optional().default(''),
});

type EditLocationFormData = z.infer<typeof editLocationSchema>;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dettagli');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<EditLocationFormData>({
    resolver: zodResolver(editLocationSchema),
  });

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/locations/${id}`);
      if (!res.ok) throw new Error('Sede non trovata');
      const json = await res.json();
      setLocation(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const openEditDialog = useCallback(() => {
    if (location) {
      reset({
        name: location.name,
        address: location.address,
        city: location.city,
        province: location.province || '',
        postalCode: location.postalCode || '',
        phone: location.phone || '',
        email: location.email || '',
      });
    }
    setEditDialogOpen(true);
  }, [location, reset]);

  const handleSave = async (data: EditLocationFormData) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore nel salvataggio');
      toast.success('Sede aggiornata con successo');
      setEditDialogOpen(false);
      fetchLocation();
    } catch (err) {
      toast.error('Errore nel salvataggio', {
        description: err instanceof Error ? err.message : 'Errore sconosciuto',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      toast.success('Sede eliminata con successo');
      router.push('/dashboard/locations');
    } catch (err) {
      toast.error("Errore nell'eliminazione", {
        description: err instanceof Error ? err.message : 'Errore sconosciuto',
      });
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dettagli', label: 'Dettagli' },
    { id: 'bay', label: 'Bay/Ponti' },
    { id: 'tecnici', label: 'Tecnici' },
    { id: 'statistiche', label: 'Statistiche' },
  ];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4' />
          <p className='text-[var(--text-tertiary)] mb-4'>{error || 'Sede non trovata'}</p>
          <Link href='/dashboard/locations'>
            <AppleButton variant='secondary'>Torna alle sedi</AppleButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sedi', href: '/dashboard/locations' },
              { label: location.name },
            ]}
          />
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{location.name}</h1>
              <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
                {location.address}, {location.postalCode} {location.city} ({location.province})
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <AppleButton variant='secondary' icon={<Edit2 className='h-4 w-4' />} onClick={openEditDialog}>
                Modifica
              </AppleButton>
              <AppleButton variant='ghost' icon={<Trash2 className='h-4 w-4 text-[var(--status-error)]' />} onClick={() => setDeleteConfirmOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      <div className='border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-primary)]/60'>
        <div className='px-8 flex gap-1'>
          {tabs.map(tab => (
            <AppleButton
              key={tab.id}
              variant='ghost'
              size='sm'
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-none border-0 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </AppleButton>
          ))}
        </div>
      </div>

      <div className='p-8'>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {activeTab === 'dettagli' && (
            <motion.div variants={cardVariants} className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <MapPin className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' /> Indirizzo
                  </h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-2'>
                  <p className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {location.address}, {location.postalCode} {location.city} ({location.province})
                  </p>
                  {location.phone && (
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Tel: {location.phone}</p>
                  )}
                  {location.email && (
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Email: {location.email}</p>
                  )}
                </AppleCardContent>
              </AppleCard>

              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' /> Orari
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {location.openingHours ? (
                    <div className='space-y-2'>
                      {Object.entries(location.openingHours).map(([day, hours]) => (
                        <div key={day} className='flex justify-between'>
                          <span className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] capitalize'>{day}</span>
                          <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {hours}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Orari non configurati</p>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {activeTab === 'bay' && (
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Warehouse className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' /> Bay/Ponti (
                    {(location.bays || []).length})
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {(location.bays || []).length === 0 ? (
                    <p className='text-center py-8 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun bay configurato.</p>
                  ) : (
                    <div className='space-y-3'>
                      {location.bays.map(bay => (
                        <div
                          key={bay.id}
                          className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                        >
                          <div>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {bay.name}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{bay.type}</p>
                          </div>
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${
                              bay.status === 'AVAILABLE'
                                ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success-subtle)] dark:text-[var(--status-success)]'
                                : 'bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:bg-[var(--status-error-subtle)] dark:text-[var(--status-error)]'
                            }`}
                          >
                            {bay.status === 'AVAILABLE' ? 'Disponibile' : 'Occupato'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {activeTab === 'tecnici' && (
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Users className='h-5 w-5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' /> Tecnici (
                    {(location.technicians || []).length})
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {(location.technicians || []).length === 0 ? (
                    <p className='text-center py-8 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun tecnico assegnato.</p>
                  ) : (
                    <div className='space-y-3'>
                      {location.technicians.map(tech => (
                        <div
                          key={tech.id}
                          className='flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]'
                        >
                          <div className='w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center'>
                            <span className='text-footnote font-bold text-[var(--brand)]'>
                              {tech.firstName[0]}
                              {tech.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {tech.firstName} {tech.lastName}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{tech.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {activeTab === 'statistiche' && (
            <motion.div variants={cardVariants}>
              {location.stats ? (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
                  <AppleCard hover={false}>
                    <AppleCardContent>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Ordini di Lavoro</p>
                      <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {location.stats.totalWo}
                      </p>
                    </AppleCardContent>
                  </AppleCard>
                  <AppleCard hover={false}>
                    <AppleCardContent>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Tempo medio (ore)</p>
                      <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {location.stats.avgCompletionTime.toFixed(1)}
                      </p>
                    </AppleCardContent>
                  </AppleCard>
                  <AppleCard hover={false}>
                    <AppleCardContent>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Fatturato</p>
                      <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(location.stats.revenue)}
                      </p>
                    </AppleCardContent>
                  </AppleCard>
                </div>
              ) : (
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='text-center py-8'>
                      <BarChart3 className='h-12 w-12 text-[var(--text-tertiary)]/40 mx-auto mb-4' />
                      <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Statistiche non disponibili.</p>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/50 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl p-6 m-4'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Modifica Sede
              </h2>
              <AppleButton variant='ghost' size='sm' onClick={() => setEditDialogOpen(false)} aria-label='Chiudi'>
                <X className='h-5 w-5 text-[var(--text-tertiary)]' />
              </AppleButton>
            </div>
            <form onSubmit={handleSubmit(handleSave)} className='space-y-4'>
              <div>
                <label htmlFor='edit-name' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                  Nome sede *
                </label>
                <Input id='edit-name' {...register('name')} />
                {formErrors.name && <p className='text-footnote text-[var(--status-error)] mt-1'>{formErrors.name.message}</p>}
              </div>
              <div>
                <label htmlFor='edit-address' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                  Indirizzo *
                </label>
                <Input id='edit-address' {...register('address')} />
                {formErrors.address && <p className='text-footnote text-[var(--status-error)] mt-1'>{formErrors.address.message}</p>}
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div>
                  <label htmlFor='edit-city' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                    Città *
                  </label>
                  <Input id='edit-city' {...register('city')} />
                  {formErrors.city && <p className='text-footnote text-[var(--status-error)] mt-1'>{formErrors.city.message}</p>}
                </div>
                <div>
                  <label htmlFor='edit-province' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                    Provincia
                  </label>
                  <Input id='edit-province' {...register('province')} />
                </div>
                <div>
                  <label htmlFor='edit-postalCode' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                    CAP
                  </label>
                  <Input id='edit-postalCode' {...register('postalCode')} />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='edit-phone' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                    Telefono
                  </label>
                  <Input id='edit-phone' {...register('phone')} />
                </div>
                <div>
                  <label htmlFor='edit-email' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block'>
                    Email
                  </label>
                  <Input id='edit-email' type='email' {...register('email')} />
                  {formErrors.email && <p className='text-footnote text-[var(--status-error)] mt-1'>{formErrors.email.message}</p>}
                </div>
              </div>
              <div className='flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
                <AppleButton variant='secondary' type='button' onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </AppleButton>
                <AppleButton loading={isSaving} type='submit'>
                  Salva Modifiche
                </AppleButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina sede'
        description='Sei sicuro di voler eliminare questa sede? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
      />
    </div>
  );
}
