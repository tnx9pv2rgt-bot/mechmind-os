import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/bookings/booking-form-complete', () => ({
  BookingFormComplete: () =>
    React.createElement('div', { 'data-testid': 'booking-form-complete' }, 'Nuova Prenotazione'),
}))

import NewBookingPage from '@/app/dashboard/bookings/new/page'

describe('NewBookingPage', () => {
  it('renders BookingFormComplete', () => {
    render(<NewBookingPage />)
    expect(screen.getByTestId('booking-form-complete')).toBeInTheDocument()
  })

  it('shows form content', () => {
    render(<NewBookingPage />)
    expect(screen.getByText('Nuova Prenotazione')).toBeInTheDocument()
  })
})
