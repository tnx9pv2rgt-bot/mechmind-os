'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Filter, Calendar } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalPageWrapper } from '@/components/portal';
import { BookingList } from '@/components/portal';
import { Booking, Customer } from '@/lib/types/portal';

// ============================================
// MOCK DATA
// ============================================

const mockBookings: Booking[] = [
  {
    id: 'b1',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    status: 'confirmed',
    type: 'maintenance',
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    scheduledTime: '09:30',
    duration: 120,
    notes: 'Tagliando ordinario',
    createdAt: new Date(),
    updatedAt: new Date(),
    location: 'MechMind Milano - Via Roma 123',
    estimatedCost: 350,
  },
  {
    id: 'b2',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 42000,
      fuelType: 'diesel',
    },
    status: 'completed',
    type: 'inspection',
    scheduledDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scheduledTime: '14:00',
    duration: 90,
    notes: 'Ispezione periodica',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    location: 'MechMind Milano - Via Roma 123',
    finalCost: 120,
    technicianName: 'Luca Bianchi',
  },
  {
    id: 'b3',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 38000,
      fuelType: 'diesel',
    },
    status: 'cancelled',
    type: 'repair',
    scheduledDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    scheduledTime: '10:00',
    duration: 180,
    notes: 'Sostituzione pastiglie freni',
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
    cancellationReason: 'Cliente ha annullato',
    location: 'MechMind Milano - Via Roma 123',
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // const currentCustomer = await portalAuth.getCurrentCustomer(token)
      const currentCustomer = null; // TODO: Get from auth context
      setCustomer(currentCustomer);

      // Mock API call
      setTimeout(() => {
        setBookings(mockBookings);
        setFilteredBookings(mockBookings);
        setIsLoading(false);
      }, 500);
    };

    loadData();
  }, []);

  useEffect(() => {
    const now = new Date();
    let filtered = bookings;

    switch (filter) {
      case 'upcoming':
        filtered = bookings.filter(
          b =>
            new Date(b.scheduledDate) >= now &&
            ['pending', 'confirmed', 'in_progress'].includes(b.status)
        );
        break;
      case 'past':
        filtered = bookings.filter(
          b =>
            new Date(b.scheduledDate) < now ||
            ['completed', 'cancelled', 'no_show'].includes(b.status)
        );
        break;
      default:
        filtered = bookings;
    }

    setFilteredBookings(filtered);
  }, [filter, bookings]);

  const handleCancel = (id: string) => {
    if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
      );
    }
  };

  const router = useRouter();

  const handleReschedule = (id: string) => {
    router.push(`/portal/bookings/new?reschedule=${id}`);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/portal/bookings/${id}`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Prenotazioni' customer={customer || undefined}>
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
      title='Le tue Prenotazioni'
      subtitle='Gestisci i tuoi appuntamenti in officina'
      customer={customer || undefined}
      action={
        <Link href='/portal/bookings/new'>
          <AppleButton icon={<Plus className='h-4 w-4' />}>Nuova Prenotazione</AppleButton>
        </Link>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <div className='flex items-center gap-2 p-1 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-apple'>
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f
                    ? 'bg-apple-blue text-white shadow-sm'
                    : 'text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec]'
                }
              `}
            >
              {f === 'all' && 'Tutte'}
              {f === 'upcoming' && 'In arrivo'}
              {f === 'past' && 'Passate'}
            </button>
          ))}
        </div>

        <div className='flex items-center gap-2 text-sm text-apple-gray dark:text-[#636366]'>
          <Calendar className='h-4 w-4' />
          <span>{filteredBookings.length} prenotazioni</span>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <BookingList
          bookings={filteredBookings}
          onCancel={handleCancel}
          onReschedule={handleReschedule}
          onViewDetails={handleViewDetails}
        />
      ) : (
        <div className='text-center py-16'>
          <Calendar className='h-16 w-16 mx-auto text-apple-gray/30 mb-4' />
          <h3 className='text-lg font-medium text-apple-dark dark:text-[#ececec] mb-2'>
            Nessuna prenotazione trovata
          </h3>
          <p className='text-apple-gray dark:text-[#636366] mb-6'>
            {filter === 'upcoming'
              ? 'Non hai prenotazioni in arrivo'
              : filter === 'past'
                ? 'Non hai prenotazioni passate'
                : 'Non hai ancora effettuato prenotazioni'}
          </p>
          <Link href='/portal/bookings/new'>
            <AppleButton icon={<Plus className='h-4 w-4' />}>Prenota Ora</AppleButton>
          </Link>
        </div>
      )}
    </PortalPageWrapper>
  );
}
