'use client';

import { BookingFormComplete } from '@/components/bookings/booking-form-complete';
const colors = {
  bg: '#1a1a1a',
};

export default function NewBookingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="p-4 sm:p-8">
        <BookingFormComplete />
      </div>
    </div>
  );
}
