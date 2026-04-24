'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CalendarIcon, Loader2, Wrench, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceScheduleWithVehicle, MaintenanceType, NotificationLevel } from '@/lib/services/maintenanceService'

const maintenanceTypes: { value: MaintenanceType; label: string }[] = [
  { value: 'OIL_CHANGE', label: 'Cambio Olio' },
  { value: 'TIRE_ROTATION', label: 'Rotazione Pneumatici' },
  { value: 'BRAKE_CHECK', label: 'Controllo Freni' },
  { value: 'FILTER', label: 'Sostituzione Filtri' },
  { value: 'INSPECTION', label: 'Ispezione Generale' },
  { value: 'BELTS', label: 'Controllo Cinghie' },
  { value: 'BATTERY', label: 'Controllo Batteria' }
]

const notificationLevels: { value: NotificationLevel; label: string }[] = [
  { value: 'ALERT', label: 'Avviso' },
  { value: 'WARNING', label: 'Attenzione' },
  { value: 'CRITICAL', label: 'Critico' }
]

// Schema for creating/editing schedule
const scheduleSchema = z.object({
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  type: z.enum(['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_CHECK', 'FILTER', 'INSPECTION', 'BELTS', 'BATTERY']),
  intervalKm: z.number().min(1, 'L\'intervallo in km deve essere maggiore di 0'),
  intervalMonths: z.number().min(1, 'L\'intervallo in mesi deve essere maggiore di 0'),
  lastServiceDate: z.string().min(1, 'La data dell\'ultimo servizio è obbligatoria'),
  lastServiceKm: z.number().min(0, 'I km devono essere maggiori o uguali a 0'),
  notificationLevel: z.enum(['ALERT', 'WARNING', 'CRITICAL'])
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

// Schema for completing maintenance
const completeSchema = z.object({
  currentKm: z.number().min(0, 'I km attuali devono essere maggiori o uguali a 0'),
  notes: z.string().optional()
})

type CompleteFormData = z.infer<typeof completeSchema>

interface MaintenanceFormProps {
  schedule?: MaintenanceScheduleWithVehicle | null
  vehicleId?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: 'create' | 'edit' | 'complete'
}

interface Vehicle {
  id: string
  make: string
  model: string
  licensePlate: string | null
  mileage: number | null
}

export function MaintenanceForm({
  schedule,
  vehicleId,
  isOpen,
  onClose,
  onSuccess,
  mode = 'create'
}: MaintenanceFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      vehicleId: vehicleId || schedule?.vehicleId || '',
      type: schedule?.type || 'OIL_CHANGE',
      intervalKm: schedule?.intervalKm || 10000,
      intervalMonths: schedule?.intervalMonths || 6,
      lastServiceDate: schedule?.lastServiceDate 
        ? new Date(schedule.lastServiceDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      lastServiceKm: schedule?.lastServiceKm || 0,
      notificationLevel: schedule?.notificationLevel || 'ALERT'
    }
  })

  const completeForm = useForm<CompleteFormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      currentKm: schedule?.vehicle?.mileage || 0,
      notes: ''
    }
  })

  useEffect(() => {
    if (isOpen && mode !== 'complete') {
      fetchVehicles()
    }
  }, [isOpen, mode])

  useEffect(() => {
    if (schedule && isOpen) {
      if (mode === 'edit') {
        form.reset({
          vehicleId: schedule.vehicleId,
          type: schedule.type,
          intervalKm: schedule.intervalKm,
          intervalMonths: schedule.intervalMonths,
          lastServiceDate: new Date(schedule.lastServiceDate).toISOString().split('T')[0],
          lastServiceKm: schedule.lastServiceKm,
          notificationLevel: schedule.notificationLevel
        })
      } else if (mode === 'complete') {
        completeForm.reset({
          currentKm: schedule.vehicle?.mileage || schedule.lastServiceKm + schedule.intervalKm,
          notes: ''
        })
      }
    }
  }, [schedule, isOpen, mode, form, completeForm])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      // Note: This would typically call your vehicles API
      // For now, we'll assume the vehicle data comes from props or context
      setVehicles([])
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitSchedule = async (data: ScheduleFormData) => {
    try {
      setSubmitting(true)
      
      const url = mode === 'edit' && schedule 
        ? `/api/maintenance/${schedule.id}` 
        : '/api/maintenance'
      
      const method = mode === 'edit' ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lastServiceDate: new Date(data.lastServiceDate).toISOString()
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
        form.reset()
      } else {
        const error = await response.json()
        console.error('Failed to save schedule:', error)
        // Show error toast
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitComplete = async (data: CompleteFormData) => {
    if (!schedule) return

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/maintenance/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: schedule.id,
          currentKm: data.currentKm,
          notes: data.notes
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
        completeForm.reset()
      } else {
        const error = await response.json()
        console.error('Failed to complete maintenance:', error)
      }
    } catch (error) {
      console.error('Error completing maintenance:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'edit':
        return 'Modifica Programmazione'
      case 'complete':
        return 'Completa Manutenzione'
      default:
        return 'Nuova Programmazione'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          {mode === 'complete' && schedule && (
            <DialogDescription>
              Completa la manutenzione per {schedule.vehicle.make} {schedule.vehicle.model}
              {' '}({getMaintenanceTypeLabel(schedule.type)})
            </DialogDescription>
          )}
        </DialogHeader>

        {mode === 'complete' ? (
          <Form {...completeForm}>
            <form onSubmit={completeForm.handleSubmit(onSubmitComplete)} className="space-y-4">
              <FormField
                control={completeForm.control}
                name="currentKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km Attuali</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={completeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-[var(--border-default)] p-2 text-sm dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-[var(--status-success)] hover:bg-[var(--status-success)]"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Completa Manutenzione
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitSchedule)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veicolo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un veicolo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} ({vehicle.licensePlate || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Manutenzione</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="intervalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervallo (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intervalMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervallo (mesi)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lastServiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Ultimo Servizio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="date" {...field} />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastServiceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km Ultimo Servizio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello di Notifica</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il livello" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {notificationLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'edit' ? 'Salva Modifiche' : 'Crea Programmazione'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getMaintenanceTypeLabel(type: MaintenanceType): string {
  const labels: Record<MaintenanceType, string> = {
    'OIL_CHANGE': 'Cambio Olio',
    'TIRE_ROTATION': 'Rotazione Pneumatici',
    'BRAKE_CHECK': 'Controllo Freni',
    'FILTER': 'Sostituzione Filtri',
    'INSPECTION': 'Ispezione Generale',
    'BELTS': 'Controllo Cinghie',
    'BATTERY': 'Controllo Batteria'
  }
  return labels[type] || type
}
