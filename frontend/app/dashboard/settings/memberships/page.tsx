'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  AlertCircle,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Users,
  Crown,
  CheckCircle2,
  X,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
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

// =============================================================================
// Types
// =============================================================================
interface ProgramBenefit {
  id?: string;
  type: string;
  description: string;
  maxPerMonth?: number;
  discountPercent?: number;
}

interface MembershipProgram {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  benefits: ProgramBenefit[];
  activeMembers: number;
  isActive: boolean;
  createdAt: string;
}

interface ProgramMember {
  id: string;
  customerName: string;
  email?: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  startDate: string;
  redemptionsUsed: number;
}

interface MembershipsResponse {
  data: MembershipProgram[];
  meta?: { total: number };
}

interface MembersResponse {
  data: ProgramMember[];
  meta?: { total: number };
}

// =============================================================================
// Validation
// =============================================================================
const benefitSchema = z.object({
  type: z.string().min(1, 'Tipo obbligatorio'),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  maxPerMonth: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
});

const programSchema = z.object({
  name: z.string().min(2, 'Nome obbligatorio (min 2 caratteri)'),
  description: z.string().optional(),
  priceMonthly: z.coerce.number().min(0, 'Prezzo mensile obbligatorio'),
  priceYearly: z.coerce.number().min(0).optional(),
  benefits: z.array(benefitSchema).min(1, 'Aggiungi almeno un beneficio'),
});

type ProgramFormData = z.infer<typeof programSchema>;

// =============================================================================
// Status Config
// =============================================================================
const memberStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Attivo', color: 'text-[var(--status-success)] dark:text-[var(--status-success)]', bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]' },
  PAUSED: { label: 'In pausa', color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning-subtle)]' },
  CANCELLED: { label: 'Cancellato', color: 'text-[var(--status-error)] dark:text-[var(--status-error)]', bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]' },
};

// =============================================================================
// Program Form Modal
// =============================================================================
function ProgramFormModal({
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (data: ProgramFormData) => void;
  initialData?: MembershipProgram;
  isSubmitting: boolean;
}): React.ReactElement {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description ?? '',
          priceMonthly: initialData.priceMonthly,
          priceYearly: initialData.priceYearly ?? 0,
          benefits: initialData.benefits.map(b => ({
            type: b.type,
            description: b.description,
            maxPerMonth: b.maxPerMonth ?? 0,
            discountPercent: b.discountPercent ?? 0,
          })),
        }
      : { name: '', description: '', priceMonthly: 0, priceYearly: 0, benefits: [{ type: '', description: '', maxPerMonth: 0, discountPercent: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'benefits' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-primary)]/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <AppleCard hover={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
            <h2 className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {initialData ? 'Modifica Programma' : 'Nuovo Programma'}
            </h2>
            <AppleButton variant="ghost" size="sm" onClick={onClose} icon={<X className="w-5 h-5" />} />
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AppleCardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1 block">Nome programma</label>
                  <input
                    {...register('name')}
                    className="w-full px-3 py-2.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                    placeholder="Es. Gold, Premium..."
                  />
                  {errors.name && <p className="text-footnote mt-1 text-[var(--status-error)]">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1 block">Descrizione</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                    placeholder="Descrivi il programma..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1 block">Prezzo mensile</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('priceMonthly')}
                      className="w-full px-3 py-2.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                    />
                    {errors.priceMonthly && <p className="text-footnote mt-1 text-[var(--status-error)]">{errors.priceMonthly.message}</p>}
                  </div>
                  <div>
                    <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1 block">Prezzo annuale</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('priceYearly')}
                      className="w-full px-3 py-2.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Benefici</label>
                    <AppleButton
                      type="button"
                      variant="text"
                      size="sm"
                      icon={<Plus className="w-3 h-3" />}
                      onClick={() => append({ type: '', description: '', maxPerMonth: 0, discountPercent: 0 })}
                    >
                      Aggiungi
                    </AppleButton>
                  </div>
                  {errors.benefits && typeof errors.benefits.message === 'string' && (
                    <p className="text-footnote mb-2 text-[var(--status-error)]">{errors.benefits.message}</p>
                  )}
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-3 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input
                              {...register(`benefits.${index}.type`)}
                              placeholder="Tipo (es. sconto, servizio)"
                              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                            />
                            <input
                              {...register(`benefits.${index}.description`)}
                              placeholder="Descrizione beneficio"
                              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                            />
                          </div>
                          {fields.length > 1 && (
                            <AppleButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              icon={<Trash2 className="w-3 h-3" />}
                              className="text-[var(--status-error)]"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Max/mese</label>
                            <input
                              type="number"
                              {...register(`benefits.${index}.maxPerMonth`)}
                              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                            />
                          </div>
                          <div>
                            <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Sconto %</label>
                            <input
                              type="number"
                              {...register(`benefits.${index}.discountPercent`)}
                              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                  <AppleButton type="button" variant="ghost" onClick={onClose}>
                    Annulla
                  </AppleButton>
                  <AppleButton type="submit" disabled={isSubmitting} loading={isSubmitting}>
                    {initialData ? 'Salva modifiche' : 'Crea programma'}
                  </AppleButton>
                </div>
              </div>
            </AppleCardContent>
          </form>
        </AppleCard>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function MembershipsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'programs' | 'members'>('programs');
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<MembershipProgram | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data, error, isLoading } = useSWR<MembershipsResponse>(
    '/api/memberships/programs',
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: membersData, isLoading: membersLoading } = useSWR<MembersResponse>(
    selectedProgramId && activeTab === 'members' ? `/api/memberships/programs?programId=${selectedProgramId}&view=members` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const programs = data?.data ?? [];
  const members = membersData?.data ?? [];

  const handleSubmitProgram = useCallback(async (formData: ProgramFormData) => {
    setIsSubmitting(true);
    try {
      const method = editingProgram ? 'PUT' : 'POST';
      const body = editingProgram ? { ...formData, id: editingProgram.id } : formData;
      const res = await fetch('/api/memberships/programs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success(editingProgram ? 'Programma aggiornato' : 'Programma creato');
      setShowForm(false);
      setEditingProgram(undefined);
      await mutate('/api/memberships/programs');
    } catch {
      toast.error('Errore durante il salvataggio del programma');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProgram]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/memberships/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Programma eliminato');
      setShowDeleteConfirm(null);
      await mutate('/api/memberships/programs');
    } catch {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleToggleActive = useCallback(async (program: MembershipProgram) => {
    setTogglingIds(prev => new Set(prev).add(program.id));
    try {
      const res = await fetch('/api/memberships/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: program.id, isActive: !program.isActive }),
      });
      if (!res.ok) throw new Error('Errore');
      toast.success(program.isActive ? 'Programma disattivato' : 'Programma attivato');
      await mutate('/api/memberships/programs');
    } catch {
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(program.id);
        return next;
      });
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <header>
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Programmi Membership</h1>
            <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
              Gestisci i programmi di abbonamento e i membri
            </p>
          </div>
          <AppleButton
            icon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditingProgram(undefined); setShowForm(true); }}
          >
            Nuovo Programma
          </AppleButton>
        </div>
      </header>

      <motion.div
        className="p-8 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tabs */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex gap-2">
                <AppleButton
                  variant={activeTab === 'programs' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('programs')}
                >
                  Programmi
                </AppleButton>
                <AppleButton
                  variant={activeTab === 'members' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('members')}
                >
                  Membri
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <motion.div variants={listItemVariants}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
              </div>
            ) : error ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Errore nel caricamento</p>
                    <AppleButton
                      variant="ghost"
                      className="mt-4"
                      icon={<RefreshCw className="h-4 w-4" />}
                      onClick={() => mutate('/api/memberships/programs')}
                    >
                      Riprova
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : programs.length === 0 ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Crown className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Nessun programma creato</p>
                    <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">
                      Crea il tuo primo programma membership
                    </p>
                    <AppleButton
                      className="mt-4"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => { setEditingProgram(undefined); setShowForm(true); }}
                    >
                      Crea programma
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {programs.map(program => (
                  <motion.div key={program.id} layout variants={itemVariants}>
                    <AppleCard hover={false} className={program.isActive ? '' : 'opacity-70'}>
                      <AppleCardContent>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-[var(--brand)]" />
                            <h3 className="text-body font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{program.name}</h3>
                          </div>
                          <button
                            onClick={() => handleToggleActive(program)}
                            disabled={togglingIds.has(program.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            {togglingIds.has(program.id) ? (
                              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                            ) : program.isActive ? (
                              <ToggleRight className="w-6 h-6 text-[var(--status-success)]" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-[var(--text-tertiary)]" />
                            )}
                          </button>
                        </div>
                        {program.description && (
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-3">{program.description}</p>
                        )}
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(program.priceMonthly)}
                          </span>
                          <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">/mese</span>
                          {program.priceYearly && program.priceYearly > 0 && (
                            <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] ml-2">
                              ({new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(program.priceYearly)}/anno)
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 mb-4">
                          {program.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--status-success)]" />
                              <div>
                                <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{benefit.description}</span>
                                {(benefit.maxPerMonth || benefit.discountPercent) && (
                                  <div className="flex gap-2 mt-0.5">
                                    {benefit.maxPerMonth && benefit.maxPerMonth > 0 && (
                                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Max {benefit.maxPerMonth}/mese</span>
                                    )}
                                    {benefit.discountPercent && benefit.discountPercent > 0 && (
                                      <span className="text-footnote text-[var(--brand)]">-{benefit.discountPercent}%</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                          <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{program.activeMembers} membri attivi</span>
                        </div>
                      </AppleCardContent>
                      <div className="flex border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                        <AppleButton
                          variant="text"
                          size="sm"
                          className="flex-1 rounded-none"
                          icon={<Edit3 className="w-3 h-3" />}
                          onClick={() => { setEditingProgram(program); setShowForm(true); }}
                        >
                          Modifica
                        </AppleButton>
                        <div className="w-px bg-apple-border/20 dark:bg-[var(--border-default)]/50" />
                        <AppleButton
                          variant="text"
                          size="sm"
                          className="flex-1 rounded-none"
                          icon={<Users className="w-3 h-3" />}
                          onClick={() => { setSelectedProgramId(program.id); setActiveTab('members'); }}
                        >
                          Membri
                        </AppleButton>
                        <div className="w-px bg-apple-border/20 dark:bg-[var(--border-default)]/50" />
                        <AppleButton
                          variant="text"
                          size="sm"
                          className="rounded-none text-[var(--status-error)]"
                          icon={<Trash2 className="w-3 h-3" />}
                          onClick={() => setShowDeleteConfirm(program.id)}
                        />
                      </div>
                    </AppleCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <motion.div variants={listItemVariants} className="space-y-4">
            {/* Program selector */}
            <AppleCard hover={false}>
              <AppleCardContent>
                <select
                  value={selectedProgramId ?? ''}
                  onChange={e => setSelectedProgramId(e.target.value || null)}
                  className="w-full h-10 px-4 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                >
                  <option value="">Seleziona programma</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </AppleCardContent>
            </AppleCard>

            {!selectedProgramId ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      Seleziona un programma per vedere i membri
                    </p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
              </div>
            ) : members.length === 0 ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Nessun membro iscritto</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <AppleCard hover={false}>
                <AppleCardContent>
                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Cliente</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Stato</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Data iscrizione</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Utilizzi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => {
                          const status = memberStatusConfig[member.status] ?? memberStatusConfig.ACTIVE;
                          return (
                            <tr key={member.id} className="border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/30">
                              <td className="px-4 py-3">
                                <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{member.customerName}</p>
                                {member.email && <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{member.email}</p>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{new Date(member.startDate).toLocaleDateString('it-IT')}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{member.redemptionsUsed}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-3">
                    {members.map(member => {
                      const status = memberStatusConfig[member.status] ?? memberStatusConfig.ACTIVE;
                      return (
                        <div key={member.id} className="p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{member.customerName}</p>
                            <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                            <span>Iscritto: {new Date(member.startDate).toLocaleDateString('it-IT')}</span>
                            <span>Utilizzi: {member.redemptionsUsed}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AppleCardContent>
              </AppleCard>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProgramFormModal
            onClose={() => { setShowForm(false); setEditingProgram(undefined); }}
            onSubmit={handleSubmitProgram}
            initialData={editingProgram}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-primary)]/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm"
            >
              <AppleCard hover={false}>
                <AppleCardContent>
                  <h3 className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">Elimina programma</h3>
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4">
                    Sei sicuro di voler eliminare questo programma? Questa azione non puo essere annullata.
                  </p>
                  <div className="flex justify-end gap-3">
                    <AppleButton variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
                      Annulla
                    </AppleButton>
                    <AppleButton
                      onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                      disabled={deletingId === showDeleteConfirm}
                      loading={deletingId === showDeleteConfirm}
                      className="bg-[var(--status-error-subtle)]0 hover:bg-[var(--status-error)] text-[var(--text-on-brand)]"
                    >
                      Elimina
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
