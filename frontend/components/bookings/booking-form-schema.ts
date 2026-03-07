/**
 * Booking Form Schema - Zod Validation
 * Apple Design 2026 - MechMind OS
 */

import { z } from 'zod'

export const bookingSchema = z.object({
  customerId: z.string().uuid('Seleziona un cliente'),
  vehicleId: z.string().uuid('Seleziona un veicolo').optional(),
  date: z.date({ required_error: 'Seleziona una data' }),
  timeSlot: z.string().min(1, 'Seleziona un orario'),
  serviceType: z.enum([
    'TAGLIANDO', 
    'FRENI', 
    'CAMBIO_OLIO', 
    'GOMME', 
    'ELETTRICA', 
    'CARROZZERIA', 
    'DIAGNOSTICA',
    'CLIMA',
    'SOSPENSIONI',
    'ALTRO'
  ], {
    required_error: 'Seleziona un tipo di servizio',
  }),
  duration: z.number().min(30, 'Durata minima 30 minuti').max(240, 'Durata massima 4 ore'),
  notes: z.string().max(500, 'Max 500 caratteri').optional(),
  mechanicId: z.string().uuid('Seleziona un meccanico').optional(),
  estimatedCost: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

export type BookingFormData = z.infer<typeof bookingSchema>

// Service type labels for UI
export const serviceTypeLabels: Record<string, string> = {
  TAGLIANDO: 'Tagliando completo',
  FRENI: 'Sistema frenante',
  CAMBIO_OLIO: 'Cambio olio',
  GOMME: 'Gomme e convergenza',
  ELETTRICA: 'Impianto elettrico',
  CARROZZERIA: 'Carrozzeria',
  DIAGNOSTICA: 'Diagnostica computerizzata',
  CLIMA: 'Climatizzatore',
  SOSPENSIONI: 'Sospensioni e sterzo',
  ALTRO: 'Altro',
}

// Service type estimated costs (€)
export const serviceTypeCosts: Record<string, { min: number; max: number; defaultDuration: number }> = {
  TAGLIANDO: { min: 150, max: 450, defaultDuration: 90 },
  FRENI: { min: 80, max: 350, defaultDuration: 60 },
  CAMBIO_OLIO: { min: 50, max: 120, defaultDuration: 30 },
  GOMME: { min: 40, max: 150, defaultDuration: 45 },
  ELETTRICA: { min: 50, max: 300, defaultDuration: 60 },
  CARROZZERIA: { min: 200, max: 1500, defaultDuration: 120 },
  DIAGNOSTICA: { min: 40, max: 100, defaultDuration: 30 },
  CLIMA: { min: 60, max: 200, defaultDuration: 45 },
  SOSPENSIONI: { min: 100, max: 500, defaultDuration: 90 },
  ALTRO: { min: 50, max: 500, defaultDuration: 60 },
}

// Time slots (30 min intervals from 08:00 to 18:00)
export const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

// Priority labels
export const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Bassa', color: 'bg-blue-100 text-blue-700' },
  normal: { label: 'Normale', color: 'bg-green-100 text-green-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
}
