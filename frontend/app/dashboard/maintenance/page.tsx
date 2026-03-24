'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { OverdueAlert } from '@/components/maintenance/OverdueAlert';
import { MaintenanceList } from '@/components/maintenance/MaintenanceList';
import { MaintenanceCalendar } from '@/components/maintenance/MaintenanceCalendar';
import { MaintenanceForm } from '@/components/maintenance/MaintenanceForm';
import { MaintenanceWidget } from '@/components/maintenance/MaintenanceWidget';
import { Plus, List, Calendar, LayoutDashboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MaintenanceScheduleWithVehicle } from '@/lib/services/maintenanceService';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
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
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link href='/dashboard'>
              <button
                className='w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5'
                style={{ color: colors.textSecondary }}
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
            </Link>
            <div>
              <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
                Manutenzione Preventiva
              </h1>
              <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                Gestisci le programmazioni di manutenzione per tutti i veicoli
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className='h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium'
            style={{ backgroundColor: colors.accent, color: colors.bg }}
          >
            <Plus className='h-4 w-4' />
            Nuova Programmazione
          </button>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Overdue Alert Banner */}
        <motion.div variants={itemVariants}>
          <OverdueAlert key={`alert-${refreshKey}`} />
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <div className='flex justify-center flex-wrap gap-2'>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className='h-10 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-2'
                style={
                  activeTab === tab.key
                    ? { backgroundColor: colors.accent, color: colors.bg }
                    : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }
                }
              >
                <tab.icon className='h-4 w-4' />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab: List */}
        {activeTab === 'list' && (
          <motion.div variants={itemVariants}>
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
          <motion.div variants={itemVariants}>
            <MaintenanceCalendar key={`calendar-${refreshKey}`} onEventClick={handleEdit} />
          </motion.div>
        )}

        {/* Tab: Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div variants={itemVariants}>
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <MaintenanceWidget className='md:col-span-2 lg:col-span-1' />

              <div
                className='rounded-2xl border p-6'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <h3 className='text-[15px] font-medium' style={{ color: colors.textPrimary }}>
                  Prossime Scadenze
                </h3>
                <p className='mt-2 text-[13px]' style={{ color: colors.textTertiary }}>
                  Visualizza le prossime scadenze di manutenzione per i tuoi veicoli
                </p>
                <button
                  className='mt-4 w-full h-10 rounded-full border text-[13px] transition-colors hover:bg-white/5'
                  style={{ borderColor: colors.border, color: colors.textPrimary }}
                  onClick={() => setActiveTab('list')}
                >
                  Vai all&apos;elenco
                </button>
              </div>

              <div
                className='rounded-2xl border p-6'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <h3 className='text-[15px] font-medium' style={{ color: colors.textPrimary }}>
                  Storico Manutenzioni
                </h3>
                <p className='mt-2 text-[13px]' style={{ color: colors.textTertiary }}>
                  Visualizza lo storico delle manutenzioni completate
                </p>
                <button
                  className='mt-4 w-full h-10 rounded-full border text-[13px] opacity-50 cursor-not-allowed'
                  style={{ borderColor: colors.border, color: colors.textPrimary }}
                  disabled
                >
                  In arrivo
                </button>
              </div>
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
