'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Eye,
  Edit,
  Settings,
  FileText,
  DollarSign,
  Package,
  UserCog,
  History,
  AlertTriangle,
  CheckIcon,
  XIcon,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'mechanic' | 'receptionist';
  avatar?: string;
  isActive: boolean;
}

interface LocationAssignment {
  userId: string;
  locationId: string;
  permissions: Permission[];
  assignedAt: Date;
  assignedBy: string;
}

type Permission =
  | 'view_dashboard'
  | 'view_orders'
  | 'edit_orders'
  | 'view_inventory'
  | 'edit_inventory'
  | 'view_customers'
  | 'edit_customers'
  | 'view_reports'
  | 'view_financials'
  | 'edit_financials'
  | 'manage_staff'
  | 'manage_settings'
  | 'transfer_stock'
  | 'approve_transfers';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  target: string;
  location: string;
  details: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface PermissionsManagerProps {
  locations: Location[];
}

// Mock users data
const mockUsers: User[] = [
  {
    id: 'USR-001',
    name: 'Marco Rossi',
    email: 'marco.rossi@mechmind.it',
    role: 'manager',
    isActive: true,
  },
  {
    id: 'USR-002',
    name: 'Laura Bianchi',
    email: 'laura.bianchi@mechmind.it',
    role: 'manager',
    isActive: true,
  },
  {
    id: 'USR-003',
    name: 'Giuseppe Verdi',
    email: 'giuseppe.verdi@mechmind.it',
    role: 'manager',
    isActive: true,
  },
  {
    id: 'USR-004',
    name: 'Anna Neri',
    email: 'anna.neri@mechmind.it',
    role: 'manager',
    isActive: false,
  },
  {
    id: 'USR-005',
    name: 'Admin Sistema',
    email: 'admin@mechmind.it',
    role: 'admin',
    isActive: true,
  },
  {
    id: 'USR-006',
    name: 'Mario Rossi',
    email: 'mario.rossi@mechmind.it',
    role: 'mechanic',
    isActive: true,
  },
  {
    id: 'USR-007',
    name: 'Luigi Bianchi',
    email: 'luigi.bianchi@mechmind.it',
    role: 'mechanic',
    isActive: true,
  },
  {
    id: 'USR-008',
    name: 'Sofia Romano',
    email: 'sofia.romano@mechmind.it',
    role: 'receptionist',
    isActive: true,
  },
];

// Mock assignments
const mockAssignments: LocationAssignment[] = [
  {
    userId: 'USR-001',
    locationId: 'LOC-001',
    permissions: [
      'view_dashboard',
      'view_orders',
      'edit_orders',
      'view_inventory',
      'view_customers',
      'edit_customers',
      'view_reports',
    ],
    assignedAt: new Date('2024-01-15'),
    assignedBy: 'Admin Sistema',
  },
  {
    userId: 'USR-002',
    locationId: 'LOC-002',
    permissions: [
      'view_dashboard',
      'view_orders',
      'edit_orders',
      'view_inventory',
      'view_customers',
      'edit_customers',
      'view_reports',
    ],
    assignedAt: new Date('2024-01-20'),
    assignedBy: 'Admin Sistema',
  },
  {
    userId: 'USR-003',
    locationId: 'LOC-003',
    permissions: [
      'view_dashboard',
      'view_orders',
      'edit_orders',
      'view_inventory',
      'view_customers',
      'edit_customers',
    ],
    assignedAt: new Date('2024-02-01'),
    assignedBy: 'Admin Sistema',
  },
  {
    userId: 'USR-004',
    locationId: 'LOC-004',
    permissions: ['view_dashboard', 'view_orders', 'view_inventory'],
    assignedAt: new Date('2024-02-10'),
    assignedBy: 'Admin Sistema',
  },
  {
    userId: 'USR-006',
    locationId: 'LOC-001',
    permissions: ['view_orders', 'edit_orders'],
    assignedAt: new Date('2024-01-16'),
    assignedBy: 'Marco Rossi',
  },
  {
    userId: 'USR-007',
    locationId: 'LOC-001',
    permissions: ['view_orders', 'edit_orders'],
    assignedAt: new Date('2024-01-18'),
    assignedBy: 'Marco Rossi',
  },
  {
    userId: 'USR-008',
    locationId: 'LOC-001',
    permissions: ['view_dashboard', 'view_orders', 'view_customers'],
    assignedAt: new Date('2024-01-20'),
    assignedBy: 'Marco Rossi',
  },
];

// Mock audit log
const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'Admin Sistema',
    action: 'Permessi modificati',
    target: 'USR-001',
    location: 'Milano Centro',
    details: 'Aggiunto permesso view_reports',
    type: 'success',
  },
  {
    id: 'LOG-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    user: 'Marco Rossi',
    action: 'Utente assegnato',
    target: 'USR-006',
    location: 'Milano Centro',
    details: 'Assegnazione come meccanico',
    type: 'success',
  },
  {
    id: 'LOG-003',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    user: 'Admin Sistema',
    action: 'Tentativo accesso negato',
    target: 'USR-004',
    location: 'Napoli Sud',
    details: 'Tentativo di accesso a sezione finanziaria',
    type: 'error',
  },
  {
    id: 'LOG-004',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    user: 'Laura Bianchi',
    action: 'Permessi modificati',
    target: 'USR-002',
    location: 'Roma Nord',
    details: 'Rimosso permesso manage_staff',
    type: 'warning',
  },
  {
    id: 'LOG-005',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    user: 'Admin Sistema',
    action: 'Nuova assegnazione',
    target: 'USR-007',
    location: 'Milano Centro',
    details: 'Assegnazione multi-sede abilitata',
    type: 'success',
  },
];

const allPermissions: {
  id: Permission;
  label: string;
  icon: React.ElementType;
  category: string;
}[] = [
  { id: 'view_dashboard', label: 'Visualizza Dashboard', icon: Eye, category: 'Generale' },
  { id: 'view_orders', label: 'Visualizza Ordini', icon: FileText, category: 'Ordini' },
  { id: 'edit_orders', label: 'Modifica Ordini', icon: Edit, category: 'Ordini' },
  { id: 'view_inventory', label: 'Visualizza Magazzino', icon: Package, category: 'Magazzino' },
  { id: 'edit_inventory', label: 'Modifica Magazzino', icon: Edit, category: 'Magazzino' },
  { id: 'transfer_stock', label: 'Trasferisci Stock', icon: Package, category: 'Magazzino' },
  { id: 'view_customers', label: 'Visualizza Clienti', icon: Users, category: 'Clienti' },
  { id: 'edit_customers', label: 'Modifica Clienti', icon: Edit, category: 'Clienti' },
  { id: 'view_reports', label: 'Visualizza Report', icon: FileText, category: 'Report' },
  { id: 'view_financials', label: 'Visualizza Finanze', icon: DollarSign, category: 'Finanze' },
  { id: 'edit_financials', label: 'Modifica Finanze', icon: Edit, category: 'Finanze' },
  { id: 'manage_staff', label: 'Gestisci Personale', icon: UserCog, category: 'Gestione' },
  { id: 'manage_settings', label: 'Gestisci Impostazioni', icon: Settings, category: 'Gestione' },
  {
    id: 'approve_transfers',
    label: 'Approva Trasferimenti',
    icon: CheckCircle2,
    category: 'Magazzino',
  },
];

const roleLabels: Record<string, string> = {
  admin: 'Amministratore',
  manager: 'Responsabile',
  mechanic: 'Meccanico',
  receptionist: 'Receptionist',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mechanic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  receptionist: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function PermissionsManager({ locations }: PermissionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set(['LOC-001']));

  // Filter users
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get user assignments
  const getUserAssignments = (userId: string) => {
    return mockAssignments.filter(a => a.userId === userId);
  };

  // Get users for location
  const getLocationUsers = (locationId: string) => {
    const assignments = mockAssignments.filter(a => a.locationId === locationId);
    return assignments
      .map(a => ({
        ...mockUsers.find(u => u.id === a.userId)!,
        permissions: a.permissions,
      }))
      .filter(u => u.id);
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ore fa`;
    return `${days} giorni fa`;
  };

  const getLogIcon = (type: AuditLogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className='h-4 w-4 text-status-ready' />;
      case 'warning':
        return <AlertTriangle className='h-4 w-4 text-status-warning' />;
      case 'error':
        return <XCircle className='h-4 w-4 text-status-urgent' />;
      default:
        return <History className='h-4 w-4 text-gray-400' />;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Tabs */}
      <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 w-fit'>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'users'
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Users className='h-4 w-4' />
          Utenti e Assegnazioni
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'roles'
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Shield className='h-4 w-4' />
          Ruoli e Permessi
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'audit'
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <History className='h-4 w-4' />
          Audit Log
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className='space-y-4'>
          {/* Controls */}
          <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                <Input
                  placeholder='Cerca utente...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10 w-64'
                />
              </div>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className='px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              >
                <option value='all'>Tutte le sedi</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <Button size='sm' onClick={() => setShowAssignModal(true)}>
              <UserPlus className='mr-2 h-4 w-4' />
              Assegna Utente
            </Button>
          </div>

          {/* Location-based User List */}
          <div className='space-y-4'>
            {locations.map(location => {
              const isExpanded = expandedLocations.has(location.id);
              const locationUsers = getLocationUsers(location.id);

              if (selectedLocation !== 'all' && selectedLocation !== location.id) return null;

              return (
                <div key={location.id} className='workshop-card overflow-hidden p-0'>
                  <button
                    onClick={() => toggleLocation(location.id)}
                    className='w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center'>
                        <Building2 className='h-5 w-5 text-brand-600' />
                      </div>
                      <div className='text-left'>
                        <h4 className='font-semibold text-gray-900 dark:text-white'>
                          {location.name}
                        </h4>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          {locationUsers.length} utenti assegnati
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='flex -space-x-2'>
                        {locationUsers.slice(0, 3).map(user => (
                          <div
                            key={user.id}
                            className='h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-brand-600'
                          >
                            {user.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </div>
                        ))}
                        {locationUsers.length > 3 && (
                          <div className='h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600'>
                            +{locationUsers.length - 3}
                          </div>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className='h-5 w-5 text-gray-400' />
                      ) : (
                        <ChevronRight className='h-5 w-5 text-gray-400' />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className='border-t border-gray-200 dark:border-gray-700'>
                      <table className='w-full'>
                        <thead className='bg-gray-50 dark:bg-gray-800'>
                          <tr>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                              Utente
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                              Ruolo
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                              Permessi
                            </th>
                            <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                              Azioni
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                          {locationUsers.map(user => (
                            <tr
                              key={user.id}
                              className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            >
                              <td className='px-6 py-4'>
                                <div className='flex items-center gap-3'>
                                  <div className='h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-medium text-brand-600'>
                                    {user.name
                                      .split(' ')
                                      .map(n => n[0])
                                      .join('')}
                                  </div>
                                  <div>
                                    <p className='font-medium text-gray-900 dark:text-white'>
                                      {user.name}
                                    </p>
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className='px-6 py-4'>
                                <span
                                  className={cn(
                                    'px-2 py-1 text-xs font-medium rounded-full',
                                    roleColors[user.role]
                                  )}
                                >
                                  {roleLabels[user.role]}
                                </span>
                              </td>
                              <td className='px-6 py-4'>
                                <div className='flex flex-wrap gap-1'>
                                  {user.permissions.slice(0, 3).map(perm => (
                                    <span
                                      key={perm}
                                      className='px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'
                                    >
                                      {allPermissions.find(p => p.id === perm)?.label.split(' ')[0]}
                                    </span>
                                  ))}
                                  {user.permissions.length > 3 && (
                                    <span className='px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'>
                                      +{user.permissions.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className='px-6 py-4 text-right'>
                                <div className='flex items-center justify-end gap-2'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0'
                                    aria-label='Modifica permessi'
                                  >
                                    <Edit2 className='h-4 w-4 text-gray-400' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0'
                                    aria-label='Rimuovi utente'
                                  >
                                    <Trash2 className='h-4 w-4 text-status-urgent' />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className='grid gap-6 lg:grid-cols-2'>
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className='workshop-card'>
              <div className='flex items-center gap-3 mb-4'>
                <div
                  className={cn(
                    'h-12 w-12 rounded-lg flex items-center justify-center',
                    roleColors[role].split(' ')[0]
                  )}
                >
                  <Shield className='h-6 w-6' />
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white'>{label}</h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {mockUsers.filter(u => u.role === role).length} utenti
                  </p>
                </div>
              </div>
              <div className='space-y-2'>
                {allPermissions
                  .filter((_, index) => {
                    // Simulate different permissions for each role
                    if (role === 'admin') return true;
                    if (role === 'manager') return index < 10;
                    if (role === 'mechanic') return index < 3;
                    if (role === 'receptionist') return [0, 2, 6, 7].includes(index);
                    return false;
                  })
                  .map(perm => (
                    <div key={perm.id} className='flex items-center gap-2 text-sm'>
                      <CheckIcon className='h-4 w-4 text-status-ready' />
                      <span className='text-gray-700 dark:text-gray-300'>{perm.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className='workshop-card'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <History className='h-5 w-5 text-brand-600' />
              Log delle Modifiche
            </h3>
            <Button variant='outline' size='sm'>
              <Download className='mr-2 h-4 w-4' />
              Esporta Log
            </Button>
          </div>
          <div className='space-y-4'>
            {mockAuditLog.map(log => (
              <div
                key={log.id}
                className='flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'
              >
                <div className='h-10 w-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm'>
                  {getLogIcon(log.type)}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <p className='font-medium text-gray-900 dark:text-white'>{log.action}</p>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    <span className='font-medium'>{log.user}</span> ha modificato{' '}
                    <span className='font-medium'>{log.target}</span> per{' '}
                    <span className='font-medium'>{log.location}</span>
                  </p>
                  <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign User Modal (simplified) */}
      {showAssignModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <UserPlus className='h-5 w-5 text-brand-600' />
              Assegna Utente a Sede
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='assignUser'
                  className='text-sm text-gray-600 dark:text-gray-400 block mb-2'
                >
                  Utente
                </label>
                <select
                  id='assignUser'
                  className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                >
                  <option>Seleziona utente...</option>
                  {mockUsers
                    .filter(u => !u.role)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor='assignLocation'
                  className='text-sm text-gray-600 dark:text-gray-400 block mb-2'
                >
                  Sede
                </label>
                <select
                  id='assignLocation'
                  className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                >
                  <option>Seleziona sede...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor='assignRole'
                  className='text-sm text-gray-600 dark:text-gray-400 block mb-2'
                >
                  Ruolo
                </label>
                <select
                  id='assignRole'
                  className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                >
                  <option>Seleziona ruolo...</option>
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='flex items-center gap-3 mt-6'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setShowAssignModal(false)}
              >
                Annulla
              </Button>
              <Button className='flex-1' onClick={() => setShowAssignModal(false)}>
                Conferma Assegnazione
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
