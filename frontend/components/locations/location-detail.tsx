'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Clock,
  Users,
  Wrench,
  Calendar,
  TrendingUp,
  Package,
  Activity,
  Edit,
  ChevronRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Star,
  FileText,
  Car,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  manager: { name: string; phone: string; email: string };
  operatingHours: { open: string; close: string; days: string };
  isActive: boolean;
}

interface LocationMetrics {
  revenue: { today: number; week: number; month: number };
  carCount: { inService: number; waiting: number; ready: number };
  aro: number;
  satisfaction: number;
  utilization: number;
  orders: number;
  trend: 'up' | 'down' | 'neutral';
}

interface LocationDetailProps {
  location: Location;
  metrics: LocationMetrics;
}

// Mock staff data
const staffMembers = [
  {
    id: 'EMP-001',
    name: 'Mario Rossi',
    role: 'mechanic',
    specialization: 'Motori',
    status: 'active',
    efficiency: 94,
  },
  {
    id: 'EMP-002',
    name: 'Luigi Bianchi',
    role: 'mechanic',
    specialization: 'Elettronica',
    status: 'active',
    efficiency: 88,
  },
  {
    id: 'EMP-003',
    name: 'Anna Verdi',
    role: 'receptionist',
    specialization: 'Customer Care',
    status: 'active',
    efficiency: 96,
  },
  {
    id: 'EMP-004',
    name: 'Giuseppe Neri',
    role: 'mechanic',
    specialization: 'Cambio/Frizione',
    status: 'break',
    efficiency: 91,
  },
  {
    id: 'EMP-005',
    name: 'Sofia Romano',
    role: 'mechanic',
    specialization: 'Elettrauto',
    status: 'off',
    efficiency: 85,
  },
];

// Mock inventory data
const inventoryItems = [
  {
    id: 'INV-001',
    name: 'Olio motore 5W30',
    sku: 'OIL-5W30-5L',
    quantity: 45,
    minLevel: 20,
    status: 'ok',
  },
  {
    id: 'INV-002',
    name: 'Freni anteriori Brembo',
    sku: 'BRK-BREM-FT',
    quantity: 12,
    minLevel: 15,
    status: 'low',
  },
  {
    id: 'INV-003',
    name: 'Filtro aria Bosch',
    sku: 'AIR-BOSCH-01',
    quantity: 28,
    minLevel: 10,
    status: 'ok',
  },
  {
    id: 'INV-004',
    name: 'Candele NGK Iridium',
    sku: 'SPK-NGK-IRD',
    quantity: 8,
    minLevel: 12,
    status: 'critical',
  },
  {
    id: 'INV-005',
    name: 'Pastiglie freno Textar',
    sku: 'PAD-TXT-FT',
    quantity: 18,
    minLevel: 10,
    status: 'ok',
  },
];

// Mock recent activity
const recentActivity = [
  {
    id: 'ACT-001',
    type: 'order',
    description: 'Nuovo ordine #ORD-4521 completato',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'Mario Rossi',
  },
  {
    id: 'ACT-002',
    type: 'inventory',
    description: 'Ricevimento merce: Olio motore 5W30 (50pz)',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    user: 'Anna Verdi',
  },
  {
    id: 'ACT-003',
    type: 'customer',
    description: 'Nuovo cliente registrato: Rossi Srl',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    user: 'Anna Verdi',
  },
  {
    id: 'ACT-004',
    type: 'appointment',
    description: 'Appuntamento modificato per Fiat Panda',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    user: 'Sistema',
  },
  {
    id: 'ACT-005',
    type: 'alert',
    description: 'Stock critico: Candele NGK Iridium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    user: 'Sistema',
  },
];

export function LocationDetail({ location, metrics }: LocationDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const mechanics = staffMembers.filter(s => s.role === 'mechanic');
  const receptionists = staffMembers.filter(s => s.role === 'receptionist');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[var(--status-success)] text-[var(--text-on-brand)]';
      case 'break':
        return 'bg-[var(--status-warning)] text-[var(--text-on-brand)]';
      case 'off':
        return 'bg-[var(--surface-hover)] text-[var(--text-on-brand)]';
      default:
        return 'bg-[var(--surface-hover)] text-[var(--text-on-brand)]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'In servizio';
      case 'break':
        return 'Pausa';
      case 'off':
        return 'Fuori turno';
      default:
        return 'Sconosciuto';
    }
  };

  const getInventoryStatus = (status: string) => {
    switch (status) {
      case 'ok':
        return { color: 'bg-[var(--status-success)]', label: 'OK' };
      case 'low':
        return { color: 'bg-[var(--status-warning)]', label: 'Basso' };
      case 'critical':
        return { color: 'bg-[var(--status-error)]', label: 'Critico' };
      default:
        return { color: 'bg-[var(--surface-hover)]', label: 'N/A' };
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <CheckCircle2 className='h-4 w-4 text-[var(--status-success)]' />;
      case 'inventory':
        return <Package className='h-4 w-4 text-[var(--status-info)]' />;
      case 'customer':
        return <User className='h-4 w-4 text-[var(--brand)]' />;
      case 'appointment':
        return <Calendar className='h-4 w-4 text-[var(--status-warning)]' />;
      case 'alert':
        return <AlertCircle className='h-4 w-4 text-[var(--status-error)]' />;
      default:
        return <Activity className='h-4 w-4 text-[var(--text-tertiary)]' />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ore fa`;
    return formatDate(date);
  };

  return (
    <div className='space-y-6'>
      {/* Location Header */}
      <div className='workshop-card'>
        <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6'>
          <div className='flex items-start gap-4'>
            <div className='h-16 w-16 rounded-xl bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
              <Building2 className='h-8 w-8 text-[var(--brand)]' />
            </div>
            <div>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{location.name}</h2>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    location.isActive
                      ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                  )}
                >
                  {location.isActive ? 'Attiva' : 'Inattiva'}
                </span>
              </div>
              <p className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-2 mt-1'>
                <MapPin className='h-4 w-4' />
                {location.address}, {location.city}, {location.region}
              </p>
              <div className='flex items-center gap-4 mt-3 text-sm'>
                <a
                  href={`tel:${location.phone}`}
                  className='flex items-center gap-1 text-[var(--brand)] hover:underline'
                >
                  <Phone className='h-4 w-4' />
                  {location.phone}
                </a>
                <a
                  href={`mailto:${location.email}`}
                  className='flex items-center gap-1 text-[var(--brand)] hover:underline'
                >
                  <Mail className='h-4 w-4' />
                  {location.email}
                </a>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='sm'>
              <Edit className='mr-2 h-4 w-4' />
              Modifica
            </Button>
            <Button size='sm'>
              <Phone className='mr-2 h-4 w-4' />
              Contatta
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6 pt-6 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-lg bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30 flex items-center justify-center'>
              <TrendingUp className='h-5 w-5 text-[var(--status-success)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Fatturato Mese</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(metrics.revenue.month)}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-lg bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40/30 flex items-center justify-center'>
              <Car className='h-5 w-5 text-[var(--status-info)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Veicoli Totali</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {metrics.carCount.inService + metrics.carCount.waiting + metrics.carCount.ready}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-lg bg-[var(--status-warning)]/20 dark:bg-[var(--status-warning)]/40/30 flex items-center justify-center'>
              <Wrench className='h-5 w-5 text-[var(--status-warning)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>ARO Medio</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(metrics.aro)}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-lg bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
              <Star className='h-5 w-5 text-[var(--brand)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Rating Clienti</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {metrics.satisfaction} / 5.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border border-[var(--border-default)] dark:border-[var(--border-default)]'>
          <TabsTrigger value='overview' className='flex items-center gap-2'>
            <Activity className='h-4 w-4' />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value='staff' className='flex items-center gap-2'>
            <Users className='h-4 w-4' />
            Personale
          </TabsTrigger>
          <TabsTrigger value='inventory' className='flex items-center gap-2'>
            <Package className='h-4 w-4' />
            Magazzino
          </TabsTrigger>
          <TabsTrigger value='activity' className='flex items-center gap-2'>
            <Clock className='h-4 w-4' />
            Attività Recenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Manager Info */}
            <div className='workshop-card lg:col-span-1'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                <User className='h-5 w-5 text-[var(--brand)]' />
                Responsabile Sede
              </h3>
              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <div className='h-12 w-12 rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
                    <User className='h-6 w-6 text-[var(--brand)]' />
                  </div>
                  <div>
                    <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {location.manager.name}
                    </p>
                    <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Responsabile</p>
                  </div>
                </div>
                <div className='space-y-2 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Phone className='h-4 w-4 text-[var(--text-tertiary)]' />
                    <a
                      href={`tel:${location.manager.phone}`}
                      className='text-[var(--brand)] hover:underline'
                    >
                      {location.manager.phone}
                    </a>
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    <Mail className='h-4 w-4 text-[var(--text-tertiary)]' />
                    <a
                      href={`mailto:${location.manager.email}`}
                      className='text-[var(--brand)] hover:underline'
                    >
                      {location.manager.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className='mt-6 pt-6 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
                <h4 className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 flex items-center gap-2'>
                  <Clock3 className='h-4 w-4 text-[var(--brand)]' />
                  Orari di Apertura
                </h4>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Giorni</span>
                    <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {location.operatingHours.days}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Orario</span>
                    <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {location.operatingHours.open} - {location.operatingHours.close}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Car Count Status */}
            <div className='workshop-card lg:col-span-2'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                <Car className='h-5 w-5 text-[var(--brand)]' />
                Stato Veicoli
              </h3>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div className='p-4 bg-[var(--status-info)]/10 rounded-lg border border-status-info/20'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='h-10 w-10 rounded-lg bg-[var(--status-info)]/20 flex items-center justify-center'>
                      <Wrench className='h-5 w-5 text-[var(--status-info)]' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {metrics.carCount.inService}
                      </p>
                      <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>In Servizio</p>
                    </div>
                  </div>
                  <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                    {Math.round(
                      (metrics.carCount.inService /
                        (metrics.carCount.inService +
                          metrics.carCount.waiting +
                          metrics.carCount.ready)) *
                        100
                    )}
                    % del totale
                  </p>
                </div>
                <div className='p-4 bg-[var(--status-warning)]/10 rounded-lg border border-status-warning/20'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='h-10 w-10 rounded-lg bg-[var(--status-warning)]/20 flex items-center justify-center'>
                      <Clock3 className='h-5 w-5 text-[var(--status-warning)]' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {metrics.carCount.waiting}
                      </p>
                      <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>In Attesa</p>
                    </div>
                  </div>
                  <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                    {Math.round(
                      (metrics.carCount.waiting /
                        (metrics.carCount.inService +
                          metrics.carCount.waiting +
                          metrics.carCount.ready)) *
                        100
                    )}
                    % del totale
                  </p>
                </div>
                <div className='p-4 bg-[var(--status-success)]/10 rounded-lg border border-status-ready/20'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='h-10 w-10 rounded-lg bg-[var(--status-success)]/20 flex items-center justify-center'>
                      <CheckCircle2 className='h-5 w-5 text-[var(--status-success)]' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {metrics.carCount.ready}
                      </p>
                      <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Pronti</p>
                    </div>
                  </div>
                  <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                    {Math.round(
                      (metrics.carCount.ready /
                        (metrics.carCount.inService +
                          metrics.carCount.waiting +
                          metrics.carCount.ready)) *
                        100
                    )}
                    % del totale
                  </p>
                </div>
              </div>

              {/* Utilization */}
              <div className='mt-6'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Utilizzo Officina
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      metrics.utilization >= 80
                        ? 'text-[var(--status-success)]'
                        : metrics.utilization >= 60
                          ? 'text-[var(--status-warning)]'
                          : 'text-[var(--status-error)]'
                    )}
                  >
                    {metrics.utilization}%
                  </span>
                </div>
                <div className='h-3 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded-full overflow-hidden'>
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      metrics.utilization >= 80
                        ? 'bg-[var(--status-success)]'
                        : metrics.utilization >= 60
                          ? 'bg-[var(--status-warning)]'
                          : 'bg-[var(--status-error)]'
                    )}
                    style={{ width: `${metrics.utilization}%` }}
                  />
                </div>
                <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-2'>
                  {metrics.utilization >= 80
                    ? 'Ottima efficienza'
                    : metrics.utilization >= 60
                      ? 'Efficienza nella media'
                      : 'Efficienza sotto la media - considera nuove assunzioni'}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='staff' className='space-y-4'>
          <div className='workshop-card'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                <Wrench className='h-5 w-5 text-[var(--brand)]' />
                Meccanici ({mechanics.length})
              </h3>
              <Button variant='outline' size='sm'>
                <Users className='mr-2 h-4 w-4' />
                Gestisci Personale
              </Button>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]'>
                  <tr>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Nome
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Specializzazione
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Stato
                    </th>
                    <th className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Efficienza
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border-default)] dark:divide-gray-700'>
                  {mechanics.map(staff => (
                    <tr key={staff.id} className='hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50'>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='h-8 w-8 rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
                            <User className='h-4 w-4 text-[var(--brand)]' />
                          </div>
                          <div>
                            <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {staff.name}
                            </p>
                            <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>{staff.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                        {staff.specialization}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            getStatusColor(staff.status)
                          )}
                        >
                          {getStatusLabel(staff.status)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <div className='w-20 h-2 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded-full overflow-hidden'>
                            <div
                              className={cn(
                                'h-full rounded-full',
                                staff.efficiency >= 90
                                  ? 'bg-[var(--status-success)]'
                                  : staff.efficiency >= 75
                                    ? 'bg-[var(--status-warning)]'
                                    : 'bg-[var(--status-error)]'
                              )}
                              style={{ width: `${staff.efficiency}%` }}
                            />
                          </div>
                          <span className='text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {staff.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='workshop-card'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                <User className='h-5 w-5 text-[var(--brand)]' />
                Reception ({receptionists.length})
              </h3>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {receptionists.map(staff => (
                <div
                  key={staff.id}
                  className='flex items-center gap-3 p-3 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg'
                >
                  <div className='h-10 w-10 rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
                    <User className='h-5 w-5 text-[var(--brand)]' />
                  </div>
                  <div className='flex-1'>
                    <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{staff.name}</p>
                    <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                      {staff.specialization}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(staff.status)
                    )}
                  >
                    {getStatusLabel(staff.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='inventory' className='space-y-4'>
          <div className='workshop-card'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                <Package className='h-5 w-5 text-[var(--brand)]' />
                Stato Magazzino
              </h3>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm'>
                  <AlertCircle className='mr-2 h-4 w-4 text-[var(--status-error)]' />
                  {inventoryItems.filter(i => i.status === 'critical').length} Critici
                </Button>
                <Button variant='outline' size='sm'>
                  <Package className='mr-2 h-4 w-4' />
                  Gestisci Stock
                </Button>
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]'>
                  <tr>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Prodotto
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      SKU
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Quantità
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Minimo
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Stato
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border-default)] dark:divide-gray-700'>
                  {inventoryItems.map(item => {
                    const status = getInventoryStatus(item.status);
                    return (
                      <tr key={item.id} className='hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50'>
                        <td className='px-4 py-3'>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{item.name}</p>
                        </td>
                        <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                          {item.sku}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <span
                            className={cn(
                              'font-medium',
                              item.quantity < item.minLevel
                                ? 'text-[var(--status-error)]'
                                : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                            )}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                          {item.minLevel}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full text-[var(--text-on-brand)]',
                              status.color
                            )}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='activity' className='space-y-4'>
          <div className='workshop-card'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2'>
                <Activity className='h-5 w-5 text-[var(--brand)]' />
                Attività Recenti
              </h3>
              <Button variant='outline' size='sm'>
                <FileText className='mr-2 h-4 w-4' />
                Vedi Tutte
              </Button>
            </div>
            <div className='space-y-4'>
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className='flex items-start gap-4 p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg'
                >
                  <div className='h-10 w-10 rounded-full bg-[var(--surface-secondary)] dark:bg-[var(--border-default)] flex items-center justify-center shadow-sm'>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {activity.description}
                    </p>
                    <div className='flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                      <span className='flex items-center gap-1'>
                        <User className='h-3 w-3' />
                        {activity.user}
                      </span>
                      <span className='flex items-center gap-1'>
                        <Clock className='h-3 w-3' />
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='shrink-0'
                    aria-label='Dettagli attività'
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
