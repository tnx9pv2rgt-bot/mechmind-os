'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Save, X } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { WarrantyType, WarrantyTypeValues } from '@/lib/services/warrantyService';

const warrantyFormSchema = z
  .object({
    vehicleId: z.string().min(1, 'Veicolo obbligatorio'),
    type: z.enum(WarrantyTypeValues as [string, ...string[]]),
    provider: z.string().min(1, 'Fornitore obbligatorio'),
    startDate: z.date({
      required_error: 'Data inizio obbligatoria',
    }),
    expirationDate: z.date({
      required_error: 'Data scadenza obbligatoria',
    }),
    coverageKm: z.coerce.number().optional().nullable(),
    currentKm: z.coerce.number().min(0, 'I km attuali devono essere positivi'),
    maxCoverage: z.coerce.number().min(0, 'La copertura massima deve essere positiva'),
    deductible: z.coerce.number().min(0, 'La franchigia deve essere positiva'),
    terms: z.string().optional(),
    certificateUrl: z.string().url().optional().or(z.literal('')),
  })
  .refine(data => data.expirationDate > data.startDate, {
    message: 'La data di scadenza deve essere successiva alla data di inizio',
    path: ['expirationDate'],
  });

type WarrantyFormValues = z.infer<typeof warrantyFormSchema>;

interface WarrantyFormProps {
  initialData?: Partial<WarrantyFormValues>;
  vehicles?: Array<{ id: string; make: string; model: string; year: number; vin: string }>;
  onSubmit: (data: WarrantyFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function WarrantyForm({
  initialData,
  vehicles = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: WarrantyFormProps) {
  const form = useForm<WarrantyFormValues>({
    resolver: zodResolver(warrantyFormSchema),
    defaultValues: {
      vehicleId: initialData?.vehicleId || '',
      type: initialData?.type || WarrantyType.MANUFACTURER,
      provider: initialData?.provider || '',
      startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
      expirationDate: initialData?.expirationDate
        ? new Date(initialData.expirationDate)
        : undefined,
      coverageKm: initialData?.coverageKm ?? null,
      currentKm: initialData?.currentKm ?? 0,
      maxCoverage: initialData?.maxCoverage ?? 0,
      deductible: initialData?.deductible ?? 0,
      terms: initialData?.terms || '',
      certificateUrl: initialData?.certificateUrl || '',
    },
  });

  const handleSubmit = (data: WarrantyFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Vehicle */}
          <FormField
            control={form.control}
            name='vehicleId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veicolo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Seleziona un veicolo' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.vin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Warranty Type */}
          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Garanzia</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Seleziona tipo' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={WarrantyType.MANUFACTURER}>Produttore</SelectItem>
                    <SelectItem value={WarrantyType.EXTENDED}>Estesa</SelectItem>
                    <SelectItem value={WarrantyType.DEALER}>Concessionario</SelectItem>
                    <SelectItem value={WarrantyType.AS_IS}>Come-&Egrave;</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Provider */}
          <FormField
            control={form.control}
            name='provider'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornitore</FormLabel>
                <FormControl>
                  <Input
                    placeholder='es. Nome Produttore o Societ&agrave; Garanzia Estesa'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Current KM */}
          <FormField
            control={form.control}
            name='currentKm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chilometri Attuali</FormLabel>
                <FormControl>
                  <Input type='number' min={0} {...field} />
                </FormControl>
                <FormDescription>Chilometri al momento della creazione garanzia</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name='startDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel className='text-white'>Data Inizio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal rounded-full h-[52px] border-[#4e4e4e] bg-[#2f2f2f] text-white hover:bg-[#383838]',
                          !field.value && 'text-[#888]'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Seleziona una data</span>}
                        <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={date => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expiration Date */}
          <FormField
            control={form.control}
            name='expirationDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel className='text-white'>Data Scadenza</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal rounded-full h-[52px] border-[#4e4e4e] bg-[#2f2f2f] text-white hover:bg-[#383838]',
                          !field.value && 'text-[#888]'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Seleziona una data</span>}
                        <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={date => date < new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Coverage */}
          <FormField
            control={form.control}
            name='maxCoverage'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Copertura Massima (€)</FormLabel>
                <FormControl>
                  <Input type='number' min={0} step='0.01' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Deductible */}
          <FormField
            control={form.control}
            name='deductible'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Franchigia per Reclamo (€)</FormLabel>
                <FormControl>
                  <Input type='number' min={0} step='0.01' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Coverage KM */}
          <FormField
            control={form.control}
            name='coverageKm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite Copertura (km)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    placeholder='Lascia vuoto per illimitato'
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>Lascia vuoto per chilometraggio illimitato</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Certificate URL */}
          <FormField
            control={form.control}
            name='certificateUrl'
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Certificato</FormLabel>
                <FormControl>
                  <Input placeholder='https://...' {...field} />
                </FormControl>
                <FormDescription>Link al certificato di garanzia PDF</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Terms */}
        <FormField
          control={form.control}
          name='terms'
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Termini e Condizioni</FormLabel>
              <FormControl>
                <Input placeholder='https://...' {...field} />
              </FormControl>
              <FormDescription>Link ai termini della garanzia PDF</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className='flex items-center justify-end gap-3'>
          {onCancel && (
            <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading} className='rounded-full h-[52px] border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'>
              <X className='h-4 w-4 mr-2' />
              Annulla
            </Button>
          )}
          <Button type='submit' disabled={isLoading} className='rounded-full h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'>
            <Save className='h-4 w-4 mr-2' />
            {isLoading ? 'Salvataggio...' : 'Salva Garanzia'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default WarrantyForm;
