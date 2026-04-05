'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Shield,
  Plus,
  Loader2,
  Users,
  ChevronRight,
  Save,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
  export: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isDefault: boolean;
  permissions: Permission[];
}

interface RolesResponse {
  data?: Role[];
  roles?: Role[];
}

const MODULES = [
  { key: 'customers', label: 'Clienti' },
  { key: 'vehicles', label: 'Veicoli' },
  { key: 'work-orders', label: 'Ordini di Lavoro' },
  { key: 'invoices', label: 'Fatture' },
  { key: 'estimates', label: 'Preventivi' },
  { key: 'bookings', label: 'Prenotazioni' },
  { key: 'parts', label: 'Ricambi' },
  { key: 'inspections', label: 'Ispezioni' },
  { key: 'analytics', label: 'Analisi' },
  { key: 'settings', label: 'Impostazioni' },
];

const fetcher = (url: string): Promise<Role[]> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore caricamento');
    const json: RolesResponse = await res.json();
    const list = json.data || json.roles;
    return Array.isArray(list) ? list : [];
  });

export default function RolesPage() {
  const { data: roles, isLoading, error, mutate } = useSWR<Role[]>(
    '/api/dashboard/settings/roles',
    fetcher,
    { onError: () => toast.error('Errore caricamento ruoli') }
  );

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setEditPermissions(
      role.permissions.length > 0
        ? [...role.permissions]
        : MODULES.map((m) => ({ module: m.key, read: false, write: false, delete: false, export: false }))
    );
  };

  const handleTogglePermission = (moduleKey: string, permType: keyof Omit<Permission, 'module'>) => {
    setEditPermissions((prev) =>
      prev.map((p) =>
        p.module === moduleKey ? { ...p, [permType]: !p[permType] } : p
      )
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/dashboard/settings/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editPermissions }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Permessi aggiornati con successo');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore salvataggio permessi');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Inserisci un nome per il ruolo');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/settings/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc }),
      });
      if (!res.ok) throw new Error('Errore creazione');
      toast.success('Ruolo creato con successo');
      setShowCreateDialog(false);
      setNewRoleName('');
      setNewRoleDesc('');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore creazione ruolo');
    } finally {
      setProcessing(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
              Impossibile caricare i ruoli.
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
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Ruoli e Permessi</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Configura i ruoli e i permessi di accesso
              </p>
            </div>
            <AppleButton onClick={() => setShowCreateDialog(true)}>
              <Plus className='w-4 h-4 mr-2' />
              Nuovo Ruolo
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Roles List */}
          <div className='space-y-3'>
            <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Ruoli
            </h3>
            {roles && roles.length > 0 ? (
              roles.map((role, index) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleSelectRole(role)}
                    className={`w-full text-left p-4 rounded-xl border transition-all min-h-[44px] ${
                      selectedRole?.id === role.id
                        ? 'border-apple-blue bg-apple-blue/5 dark:bg-apple-blue/10'
                        : 'border-apple-border/30 dark:border-[var(--border-default)] hover:border-apple-blue/50 bg-white dark:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <Shield className='w-4 h-4 text-apple-blue' />
                          <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            {role.name}
                          </p>
                          {role.isDefault && (
                            <Badge variant='outline' className='text-xs'>Predefinito</Badge>
                          )}
                        </div>
                        <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                          {role.description}
                        </p>
                        <div className='flex items-center gap-1 mt-2'>
                          <Users className='w-3 h-3 text-apple-gray' />
                          <span className='text-xs text-apple-gray'>
                            {role.userCount} {role.userCount === 1 ? 'utente' : 'utenti'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className='w-4 h-4 text-apple-gray flex-shrink-0' />
                    </div>
                  </button>
                </motion.div>
              ))
            ) : (
              <AppleCard>
                <AppleCardContent className='text-center py-8'>
                  <Shield className='w-10 h-10 text-apple-gray/30 mx-auto mb-3' />
                  <p className='text-body text-apple-gray'>Nessun ruolo configurato</p>
                </AppleCardContent>
              </AppleCard>
            )}
          </div>

          {/* Permission Matrix */}
          <div className='lg:col-span-2'>
            {selectedRole ? (
              <AppleCard>
                <AppleCardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                        Permessi: {selectedRole.name}
                      </h3>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                        {selectedRole.description}
                      </p>
                    </div>
                    <AppleButton onClick={handleSavePermissions} disabled={processing}>
                      {processing ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : <Save className='w-4 h-4 mr-2' />}
                      Salva
                    </AppleButton>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b border-apple-border/30 dark:border-[var(--border-default)]'>
                          <th className='text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            Modulo
                          </th>
                          <th className='text-center py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            Lettura
                          </th>
                          <th className='text-center py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            Scrittura
                          </th>
                          <th className='text-center py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            Eliminazione
                          </th>
                          <th className='text-center py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                            Esportazione
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map((mod) => {
                          const perm = editPermissions.find((p) => p.module === mod.key) || {
                            module: mod.key,
                            read: false,
                            write: false,
                            delete: false,
                            export: false,
                          };
                          return (
                            <tr
                              key={mod.key}
                              className='border-b border-apple-border/20 dark:border-[var(--border-default)]/50'
                            >
                              <td className='py-3 px-4 text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                                {mod.label}
                              </td>
                              {(['read', 'write', 'delete', 'export'] as const).map((type) => (
                                <td key={type} className='py-3 px-4 text-center'>
                                  <label className='inline-flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer'>
                                    <input
                                      type='checkbox'
                                      checked={perm[type]}
                                      onChange={() => handleTogglePermission(mod.key, type)}
                                      className='w-5 h-5 rounded border-apple-border text-apple-blue focus:ring-apple-blue cursor-pointer'
                                    />
                                  </label>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <AppleCard>
                <AppleCardContent className='text-center py-16'>
                  <Shield className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                  <h3 className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'>
                    Seleziona un ruolo
                  </h3>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    Seleziona un ruolo dalla lista per visualizzare e modificare i permessi.
                  </p>
                </AppleCardContent>
              </AppleCard>
            )}
          </div>
        </div>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Nuovo Ruolo</DialogTitle>
            <DialogDescription>Crea un nuovo ruolo per il tuo team.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label htmlFor='role-name' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                Nome
              </label>
              <Input
                id='role-name'
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder='es. Responsabile Magazzino'
                className='h-11 rounded-xl'
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='role-desc' className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                Descrizione
              </label>
              <Input
                id='role-desc'
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder='Descrizione del ruolo'
                className='h-11 rounded-xl'
              />
            </div>
          </div>
          <DialogFooter>
            <AppleButton variant='secondary' onClick={() => setShowCreateDialog(false)}>
              Annulla
            </AppleButton>
            <AppleButton onClick={handleCreateRole} disabled={processing}>
              {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Crea Ruolo'}
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
