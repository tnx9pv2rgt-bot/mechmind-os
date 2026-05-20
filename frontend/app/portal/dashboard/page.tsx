'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import {
  Calendar,
  Wrench,
  FileText,
  Shield,
  ChevronRight,
  Plus,
  Car,
  Phone,
  MessageCircle,
  FileCheck,
  ArrowRight,
  Euro,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalLayout } from '@/components/portal';
import { BookingCard, InspectionCard, MaintenanceItem, WarrantySummary } from '@/components/portal';
import { PortalAuthService } from '@/lib/auth/portal-auth-client';
import {
  DashboardData,
  Customer,
  CustomerVehicle,
  Booking,
  CustomerInspection,
  MaintenanceSchedule,
  WarrantyInfo,
} from '@/lib/types/portal';

/** Extract unique vehicles from dashboard data (bookings, maintenance, inspections) */
function extractVehicles(data: DashboardData): CustomerVehicle[] {
  const vehicleMap = new Map<string, CustomerVehicle>();

  if (data.upcomingBooking?.vehicle) {
    const v = data.upcomingBooking.vehicle;
    vehicleMap.set(v.id, v);
  }

  for (const m of data.maintenanceDue) {
    if (m.vehicle) {
      vehicleMap.set(m.vehicle.id, m.vehicle);
    }
  }

  if (data.recentInspection?.vehicle) {
    const v = data.recentInspection.vehicle;
    vehicleMap.set(v.id, v);
  }

  return Array.from(vehicleMap.values());
}

// ============================================
// MAIN COMPONENT
// ============================================

const dashboardFetcher = async (url: string): Promise<{ data: DashboardData }> => {
  const auth = PortalAuthService.getInstance();
  const token = auth.getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json();
};

export default function PortalDashboardPage() {
  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR('/api/portal/dashboard', dashboardFetcher);

  const data = rawData?.data || null;
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento della dashboard'
    : null;
  const customer = data?.customer || null;

  if (isLoading || !data) {
    return (
      <PortalLayout customer={customer || undefined}>
        <div className='p-8 flex items-center justify-center min-h-screen'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full'
          />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout customer={customer || undefined}>
        <div className='p-8 text-center'>
          <p className='text-[var(--status-error)] mb-4'>{error}</p>
          <button
            onClick={() => mutate()}
            className='text-[var(--brand)] hover:underline'
          >
            Riprova
          </button>
        </div>
      </PortalLayout>
    );
  }

  const welcomeMessage = `Ciao, ${data.customer.firstName}!`;
  const hasUpcomingBooking = !!data.upcomingBooking;
  const hasMaintenanceDue = data.maintenanceDue.length > 0;

  // Quick stats from dashboard data
  const unpaidInvoicesCount = data.unpaidInvoices?.count ?? 0;
  const unpaidInvoicesTotal = data.unpaidInvoices?.total ?? 0;
  const activeRepairsCount = data.activeRepairs?.count ?? 0;
  const nextBookingDate = data.upcomingBooking?.scheduledDate
    ? new Date(data.upcomingBooking.scheduledDate).toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;
  const overdueMaintenanceCount = data.maintenanceDue.filter(
    (m: MaintenanceSchedule) => m.dueDate && new Date(m.dueDate) < new Date()
  ).length;

  return (
    <PortalLayout customer={data.customer}>
      <div className='p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'>
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 sm:mb-8'
        >
          <h1 className='text-2xl sm:text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            {welcomeMessage}
          </h1>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
            Ecco cosa c&apos;è di nuovo con i tuoi veicoli
          </p>
        </motion.div>

        {/* Quick Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8'
        >
          {/* Next Appointment */}
          <AppleCard>
            <AppleCardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] flex items-center justify-center'>
                  <Calendar className='h-5 w-5 text-[var(--brand)]' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] truncate'>Prossimo appuntamento</p>
                  <p className='font-semibold text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate'>
                    {nextBookingDate || 'Nessuno'}
                  </p>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>

          {/* Active Repairs */}
          <AppleCard>
            <AppleCardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/20 flex items-center justify-center'>
                  <Wrench className='h-5 w-5 text-[var(--status-warning)]' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] truncate'>Riparazioni in corso</p>
                  <p className='font-semibold text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {activeRepairsCount}
                  </p>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>

          {/* Unpaid Invoices */}
          <AppleCard>
            <AppleCardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  unpaidInvoicesCount > 0
                    ? 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]'
                    : 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]'
                }`}>
                  <Euro className={`h-5 w-5 ${
                    unpaidInvoicesCount > 0 ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'
                  }`} />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] truncate'>Fatture da pagare</p>
                  <p className='font-semibold text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {unpaidInvoicesCount > 0
                      ? `${unpaidInvoicesCount} (${unpaidInvoicesTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })})`
                      : 'Nessuna'}
                  </p>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>

          {/* Overdue Maintenance */}
          <AppleCard>
            <AppleCardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  overdueMaintenanceCount > 0
                    ? 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]'
                    : 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]'
                }`}>
                  <AlertCircle className={`h-5 w-5 ${
                    overdueMaintenanceCount > 0 ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'
                  }`} />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] truncate'>Manutenzione scaduta</p>
                  <p className='font-semibold text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {overdueMaintenanceCount > 0 ? `${overdueMaintenanceCount} scadut${overdueMaintenanceCount === 1 ? 'a' : 'e'}` : 'Tutto ok'}
                  </p>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8'
        >
          <Link href='/portal/bookings/new'>
            <div className='p-4 bg-[var(--brand)] text-[var(--text-on-brand)] rounded-2xl hover:shadow-apple-lg transition-all cursor-pointer group'>
              <Calendar className='h-6 w-6 mb-2 opacity-80' />
              <p className='font-medium text-sm'>Prenota</p>
              <p className='text-xs opacity-70'>Appuntamento</p>
              <ArrowRight className='h-4 w-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          </Link>

          <Link href='/portal/documents'>
            <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group'>
              <FileText className='h-6 w-6 mb-2 text-[var(--brand)]' />
              <p className='font-medium text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Documenti</p>
              <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Fatture e report</p>
              <ArrowRight className='h-4 w-4 mt-2 text-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          </Link>

          <Link href='/portal/maintenance'>
            <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group'>
              <Wrench className='h-6 w-6 mb-2 text-[var(--status-warning)]' />
              <p className='font-medium text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Manutenzione
              </p>
              <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Scadenze</p>
              <ArrowRight className='h-4 w-4 mt-2 text-[var(--status-warning)] opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          </Link>

          <a href='tel:+390212345678' className='block'>
            <div className='p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl shadow-apple hover:shadow-apple-hover transition-all cursor-pointer group'>
              <Phone className='h-6 w-6 mb-2 text-[var(--status-success)]' />
              <p className='font-medium text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Contatta</p>
              <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Assistenza</p>
              <ArrowRight className='h-4 w-4 mt-2 text-[var(--status-success)] opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          </a>
        </motion.div>

        {/* Main Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Left Column */}
          <div className='space-y-6'>
            {/* Upcoming Booking */}
            {hasUpcomingBooking && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className='flex items-center justify-between mb-3'>
                  <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Prossima Prenotazione
                  </h2>
                  <Link
                    href='/portal/bookings'
                    className='text-sm text-[var(--brand)] hover:underline flex items-center gap-1'
                  >
                    Tutte <ChevronRight className='h-4 w-4' />
                  </Link>
                </div>
                <BookingCard booking={data.upcomingBooking!} compact />
              </motion.div>
            )}

            {/* Maintenance Due */}
            {hasMaintenanceDue && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className='flex items-center justify-between mb-3'>
                  <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Manutenzione in Scadenza
                  </h2>
                  <Link
                    href='/portal/maintenance'
                    className='text-sm text-[var(--brand)] hover:underline flex items-center gap-1'
                  >
                    Tutte <ChevronRight className='h-4 w-4' />
                  </Link>
                </div>
                <MaintenanceItem maintenance={data.maintenanceDue[0]} compact />
              </motion.div>
            )}

            {/* Recent Inspection */}
            {data.recentInspection && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className='flex items-center justify-between mb-3'>
                  <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Ultima Ispezione
                  </h2>
                  <Link
                    href='/portal/inspections'
                    className='text-sm text-[var(--brand)] hover:underline flex items-center gap-1'
                  >
                    Tutte <ChevronRight className='h-4 w-4' />
                  </Link>
                </div>
                <InspectionCard inspection={data.recentInspection} compact />
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className='space-y-6'>
            {/* Warranty Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AppleCard>
                <AppleCardContent className='p-5'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-12 h-12 rounded-2xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] flex items-center justify-center'>
                        <Shield className='h-6 w-6 text-[var(--status-success)]' />
                      </div>
                      <div>
                        <h2 className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          Garanzie Attive
                        </h2>
                        <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          {data.warrantyStatus.total} polizze totali
                        </p>
                      </div>
                    </div>
                    <Link href='/portal/warranty'>
                      <AppleButton variant='ghost' size='sm'>
                        Gestisci
                      </AppleButton>
                    </Link>
                  </div>

                  <div className='grid grid-cols-3 gap-3'>
                    <div className='text-center p-3 bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] rounded-xl'>
                      <p className='text-2xl font-bold text-[var(--status-success)]'>
                        {data.warrantyStatus.active}
                      </p>
                      <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Attive</p>
                    </div>
                    <div className='text-center p-3 bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/20 rounded-xl'>
                      <p className='text-2xl font-bold text-[var(--status-warning)]'>
                        {data.warrantyStatus.expiringSoon}
                      </p>
                      <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>In scadenza</p>
                    </div>
                    <div className='text-center p-3 bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] rounded-xl'>
                      <p className='text-2xl font-bold text-[var(--text-tertiary)]'>
                        {data.warrantyStatus.expired}
                      </p>
                      <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Scadute</p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Vehicles Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AppleCard>
                <AppleCardContent className='p-5'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-12 h-12 rounded-2xl bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] flex items-center justify-center'>
                        <Car className='h-6 w-6 text-[var(--brand)]' />
                      </div>
                      <div>
                        <h2 className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          I tuoi veicoli
                        </h2>
                        <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          {(() => {
                            const vehicles = extractVehicles(data);
                            if (vehicles.length === 0) return 'Nessun veicolo registrato';
                            return `${vehicles.length} veicol${vehicles.length === 1 ? 'o' : 'i'} registrat${vehicles.length === 1 ? 'o' : 'i'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const vehicles = extractVehicles(data);
                    if (vehicles.length === 0) {
                      return (
                        <div className='flex flex-col items-center justify-center py-8 text-center'>
                          <Car className='h-10 w-10 text-[var(--text-tertiary)]/40 dark:text-[var(--text-secondary)]/40 mb-3' />
                          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            Nessun veicolo registrato
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className='space-y-3'>
                        {vehicles.map((vehicle) => (
                          <div key={vehicle.id} className='p-4 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-2xl'>
                            <div className='flex items-center gap-4'>
                              <div className='w-14 h-14 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] flex items-center justify-center shadow-sm'>
                                <Car className='h-7 w-7 text-[var(--text-tertiary)]' />
                              </div>
                              <div className='flex-1'>
                                <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                  {vehicle.make} {vehicle.model}
                                </p>
                                <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                  {vehicle.licensePlate} {vehicle.mileage ? `\u2022 ${vehicle.mileage.toLocaleString('it-IT')} km` : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Contact Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AppleCard className='bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)]'>
                <AppleCardContent className='p-5 text-[var(--text-on-brand)]'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <h2 className='font-semibold text-lg mb-1'>Serve aiuto?</h2>
                      <p className='text-[var(--text-on-brand)]/80 text-sm mb-4'>
                        Il nostro team è disponibile per assisterti
                      </p>
                      <div className='flex gap-2'>
                        <a
                          href='tel:+390212345678'
                          className='inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)]/20 rounded-xl text-sm font-medium hover:bg-[var(--surface-secondary)]/30 transition-colors'
                        >
                          <Phone className='h-4 w-4' />
                          Chiama
                        </a>
                        <a
                          href='https://wa.me/390212345678'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)]/20 rounded-xl text-sm font-medium hover:bg-[var(--surface-secondary)]/30 transition-colors'
                        >
                          <MessageCircle className='h-4 w-4' />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <div className='w-16 h-16 rounded-2xl bg-[var(--surface-secondary)]/20 flex items-center justify-center'>
                      <MessageCircle className='h-8 w-8' />
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
