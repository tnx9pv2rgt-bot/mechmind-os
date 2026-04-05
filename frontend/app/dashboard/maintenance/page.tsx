'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { OverdueAlert } from '@/components/maintenance/OverdueAlert';
import { MaintenanceList } from '@/components/maintenance/MaintenanceList';
import { MaintenanceCalendar } from '@/components/maintenance/MaintenanceCalendar';
import { MaintenanceForm } from '@/components/maintenance/MaintenanceForm';
import { MaintenanceWidget } from '@/components/maintenance/MaintenanceWidget';
import { Plus, List, Calendar, LayoutDashboard } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import type { MaintenanceScheduleWithVehicle } from '@/lib/services/maintenanceService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
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

export default function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceScheduleWithVehicle | null>(
    null
  );
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'complete'>('create');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'dashboard'>('list');

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleCreate = () => {
    setSelectedSchedule(null);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEdit = (schedule: MaintenanceScheduleWithVehicle) => {
    setSelectedSchedule(schedule);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleComplete = (schedule: MaintenanceScheduleWithVehicle) => {
    setSelectedSchedule(schedule);
    setFormMode('complete');
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedSchedule(null);
    handleRefresh();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedSchedule(null);
  };

  const tabs = [
    { key: 'list' as const, label: 'Elenco', icon: List },
    { key: 'calendar' as const, label: 'Calendario', icon: Calendar },
    { key: 'dashboard' as const, label: 'Pannello', icon: LayoutDashboard },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
              Manutenzione Preventiva
            </h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci le programmazioni di manutenzione per tutti i veicoli
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />} onClick={handleCreate}>
              Nuova Programmazione
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Overdue Alert Banner */}
        <motion.div variants={listItemVariants}>
          <OverdueAlert key={`alert-${refreshKey}`} />
        </motion.div>

        {/* Tabs */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex justify-center flex-wrap gap-2'>
                {tabs.map(tab => (
                  <AppleButton
                    key={tab.key}
                    variant={activeTab === tab.key ? 'primary' : 'ghost'}
                    icon={<tab.icon className='h-4 w-4' />}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </AppleButton>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Tab: List */}
        {activeTab === 'list' && (
          <motion.div variants={listItemVariants}>
            <MaintenanceList
              key={`list-${refreshKey}`}
              showFilters={true}
              onEdit={handleEdit}
              onComplete={handleComplete}
            />
          </motion.div>
        )}

        {/* Tab: Calendar */}
        {activeTab === 'calendar' && (
          <motion.div variants={listItemVariants}>
            <MaintenanceCalendar key={`calendar-${refreshKey}`} onEventClick={handleEdit} />
          </motion.div>
        )}

        {/* Tab: Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div variants={listItemVariants}>
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <MaintenanceWidget className='md:col-span-2 lg:col-span-1' />

              <AppleCard hover={false}>
                <AppleCardContent>
                  <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Prossime Scadenze
                  </h3>
                  <p className='mt-2 text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    Visualizza le prossime scadenze di manutenzione per i tuoi veicoli
                  </p>
                  <AppleButton
                    variant='ghost'
                    fullWidth
                    className='mt-4'
                    onClick={() => setActiveTab('list')}
                  >
                    Vai all&apos;elenco
                  </AppleButton>
                </AppleCardContent>
              </AppleCard>

              <AppleCard hover={false}>
                <AppleCardContent>
                  <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Storico Manutenzioni
                  </h3>
                  <p className='mt-2 text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    Visualizza lo storico delle manutenzioni completate
                  </p>
                  <AppleButton
                    variant='ghost'
                    fullWidth
                    className='mt-4'
                    onClick={() => setActiveTab('list')}
                  >
                    Vedi storico
                  </AppleButton>
                </AppleCardContent>
              </AppleCard>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Form Dialog */}
      <MaintenanceForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        schedule={selectedSchedule}
        mode={formMode}
      />
    </div>
  );
}
