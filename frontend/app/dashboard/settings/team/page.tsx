'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  UserPlus,
  Loader2,
  MoreHorizontal,
  Mail,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
  avatar?: string;
}

interface TeamResponse {
  data?: TeamMember[];
  users?: TeamMember[];
}

const ROLES = [
  { value: 'OWNER', label: 'Titolare' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'MECHANIC', label: 'Meccanico' },
  { value: 'RECEPTION', label: 'Accettazione' },
  { value: 'ADMIN', label: 'Amministrazione' },
];

const inviteSchema = z.object({
  email: z.string().email('Formato email non valido'),
  role: z.string().min(1, 'Seleziona un ruolo'),
});

type InviteForm = z.infer<typeof inviteSchema>;

const fetcher = (url: string): Promise<TeamMember[]> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore caricamento');
    const json: TeamResponse = await res.json();
    const list = json.data || json.users;
    return Array.isArray(list) ? list : [];
  });

export default function TeamPage() {
  const { data: members, isLoading, error, mutate } = useSWR<TeamMember[]>(
    '/api/dashboard/settings/team',
    fetcher,
    { onError: () => toast.error('Errore caricamento team') }
  );

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [processing, setProcessing] = useState(false);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: '' },
  });

  const handleInvite = async (data: InviteForm) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/settings/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Errore invio invito');
      }
      toast.success(`Invito inviato a ${data.email}`);
      form.reset();
      setShowInviteDialog(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore invio invito');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedMember.id, role: editRole, action: 'updateRole' }),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      toast.success('Ruolo aggiornato con successo');
      setShowEditDialog(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore aggiornamento ruolo');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async (member: TeamMember) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.id,
          status: member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE',
          action: 'toggleStatus',
        }),
      });
      if (!res.ok) throw new Error('Errore');
      toast.success(member.status === 'ACTIVE' ? 'Utente disattivato' : 'Utente riattivato');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore operazione');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
      ACTIVE: { bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30', text: 'text-[var(--status-success)] dark:text-[var(--status-success)]', label: 'Attivo', icon: CheckCircle },
      INVITED: { bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40/30', text: 'text-[var(--status-info)] dark:text-[var(--status-info)]', label: 'Invitato', icon: Mail },
      DEACTIVATED: { bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]', text: 'text-[var(--text-primary)] dark:text-[var(--text-primary)]', label: 'Disattivato', icon: XCircle },
    };
    const c = map[status] || map.ACTIVE;
    const Icon = c.icon;
    return (
      <Badge className={`${c.bg} ${c.text} border-0 gap-1`}>
        <Icon className='w-3 h-3' />
        {c.label}
      </Badge>
    );
  };

  const getRoleLabel = (role: string): string => {
    return ROLES.find((r) => r.value === role)?.label || role;
  };

  // Loading
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-[var(--status-error)] mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Impossibile caricare i membri del team.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Team</h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Gestisci i membri del tuo team
              </p>
            </div>
            <AppleButton onClick={() => setShowInviteDialog(true)}>
              <UserPlus className='w-4 h-4 mr-2' />
              Invita Membro
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-5xl mx-auto'>
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center gap-3'>
              <Users className='h-5 w-5 text-[var(--brand)]' />
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Membri ({members?.length || 0})
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {members && members.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)]'>
                      <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Nome</th>
                      <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Email</th>
                      <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ruolo</th>
                      <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Stato</th>
                      <th className='text-left py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ultimo accesso</th>
                      <th className='text-right py-3 px-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className='border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors'
                      >
                        <td className='py-3 px-4'>
                          <div className='flex items-center gap-3'>
                            <div className='w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-sm font-medium flex-shrink-0'>
                              {member.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {member.name}
                            </span>
                          </div>
                        </td>
                        <td className='py-3 px-4 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          {member.email}
                        </td>
                        <td className='py-3 px-4'>
                          <Badge variant='outline' className='gap-1'>
                            <Shield className='w-3 h-3' />
                            {getRoleLabel(member.role)}
                          </Badge>
                        </td>
                        <td className='py-3 px-4'>{getStatusBadge(member.status)}</td>
                        <td className='py-3 px-4 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          {member.lastLogin ? (
                            <span className='flex items-center gap-1'>
                              <Clock className='w-3 h-3' />
                              {new Date(member.lastLogin).toLocaleDateString('it-IT')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              className='min-w-[44px] min-h-[44px]'
                              onClick={() => {
                                setSelectedMember(member);
                                setEditRole(member.role);
                                setShowEditDialog(true);
                              }}
                            >
                              <MoreHorizontal className='w-4 h-4' />
                            </AppleButton>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-[var(--text-tertiary)]/30 mx-auto mb-4' />
                <h3 className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                  Nessun membro nel team
                </h3>
                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Invita il primo membro del tuo team.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Invita Membro</DialogTitle>
            <DialogDescription>
              Inserisci l&apos;email e il ruolo del nuovo membro del team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleInvite)} className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label htmlFor='invite-email' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Email
              </label>
              <Input
                id='invite-email'
                type='email'
                placeholder='nome@esempio.it'
                {...form.register('email')}
                className='h-11 rounded-xl'
              />
              {form.formState.errors.email && (
                <p className='text-footnote text-[var(--status-error)]'>{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className='space-y-2'>
              <label htmlFor='invite-role' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Ruolo
              </label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v)}
              >
                <SelectTrigger id='invite-role' className='h-11 rounded-xl'>
                  <SelectValue placeholder='Seleziona ruolo' />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className='text-footnote text-[var(--status-error)]'>{form.formState.errors.role.message}</p>
              )}
            </div>
            <DialogFooter>
              <AppleButton variant='secondary' type='button' onClick={() => setShowInviteDialog(false)}>
                Annulla
              </AppleButton>
              <AppleButton type='submit' disabled={processing}>
                {processing ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : <Mail className='w-4 h-4 mr-2' />}
                Invia Invito
              </AppleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Modifica Membro</DialogTitle>
            <DialogDescription>{selectedMember?.name} - {selectedMember?.email}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label htmlFor='edit-role' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Ruolo
              </label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id='edit-role' className='h-11 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2'>
              <AppleButton
                variant='ghost'
                className={selectedMember?.status === 'ACTIVE' ? 'text-[var(--status-warning)]' : 'text-[var(--status-success)]'}
                onClick={() => selectedMember && handleDeactivate(selectedMember)}
                disabled={processing}
              >
                {selectedMember?.status === 'ACTIVE' ? 'Disattiva' : 'Riattiva'}
              </AppleButton>
              <AppleButton variant='ghost' className='text-[var(--status-error)]'>
                <Trash2 className='w-4 h-4 mr-2' />
                Rimuovi
              </AppleButton>
            </div>
          </div>
          <DialogFooter>
            <AppleButton variant='secondary' onClick={() => setShowEditDialog(false)}>
              Annulla
            </AppleButton>
            <AppleButton onClick={handleUpdateRole} disabled={processing}>
              {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Salva'}
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
