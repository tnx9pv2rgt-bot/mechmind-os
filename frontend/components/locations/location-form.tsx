'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppleButton } from '@/components/ui/apple-button';
import { Switch } from '@/components/ui/switch';
import { Building2, MapPin, Phone, Mail, Globe, Save, X } from 'lucide-react';
import { LocationFormData } from './location-form-schema';

const createLocationSchema = z.object({
  name: z.string().min(1, 'Il nome della sede è obbligatorio').max(100, 'Nome troppo lungo'),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'Il CAP deve essere di 5 cifre')
    .optional()
    .or(z.literal('')),
  country: z.string().default('IT'),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{8,}$/, 'Numero di telefono non valido')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  isMain: z.boolean().default(false),
});

type CreateLocationFormData = z.infer<typeof createLocationSchema>;

interface LocationFormProps {
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<LocationFormData> | Record<string, unknown>;
}

export function LocationForm({ onSubmit, onCancel, initialData }: LocationFormProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLocationFormData>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: (initialData?.name as string) || '',
      address: (initialData?.address as string) || '',
      city: (initialData?.city as string) || '',
      postalCode: (initialData as Record<string, unknown>)?.postalCode as string || '',
      country: (initialData as Record<string, unknown>)?.country as string || 'IT',
      phone: (initialData?.phone as string) || '',
      email: (initialData?.email as string) || '',
      isMain: (initialData as Record<string, unknown>)?.isMain as boolean || false,
    },
  });

  const isMain = watch('isMain');

  const handleFormSubmit = async (data: CreateLocationFormData): Promise<void> => {
    // Strip empty strings to avoid sending them as values
    const cleaned: Record<string, unknown> = { name: data.name };
    if (data.address) cleaned.address = data.address;
    if (data.city) cleaned.city = data.city;
    if (data.postalCode) cleaned.postalCode = data.postalCode;
    if (data.country && data.country !== 'IT') cleaned.country = data.country;
    if (data.phone) cleaned.phone = data.phone;
    if (data.email) cleaned.email = data.email;
    if (data.isMain) cleaned.isMain = true;

    await onSubmit?.(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nome sede */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--brand)]" />
          Nome sede *
        </Label>
        <Input
          id="name"
          placeholder="Es. Officina Centro, Sede Nord..."
          className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-[var(--status-error)]">{errors.name.message}</p>
        )}
      </div>

      {/* Indirizzo + Città */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--status-warning)]" />
            Indirizzo
          </Label>
          <Input
            id="address"
            placeholder="Via Roma 1"
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('address')}
          />
          {errors.address && (
            <p className="text-sm text-[var(--status-error)]">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Città
          </Label>
          <Input
            id="city"
            placeholder="Milano"
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('city')}
          />
          {errors.city && (
            <p className="text-sm text-[var(--status-error)]">{errors.city.message}</p>
          )}
        </div>
      </div>

      {/* CAP + Paese */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            CAP
          </Label>
          <Input
            id="postalCode"
            placeholder="20100"
            maxLength={5}
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('postalCode')}
          />
          {errors.postalCode && (
            <p className="text-sm text-[var(--status-error)]">{errors.postalCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--status-success)]" />
            Paese
          </Label>
          <Input
            id="country"
            placeholder="IT"
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('country')}
          />
        </div>
      </div>

      {/* Telefono + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Phone className="h-4 w-4 text-apple-teal" />
            Telefono
          </Label>
          <Input
            id="phone"
            placeholder="+39 02 1234567"
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-[var(--status-error)]">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--brand)]" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="sede@officina.it"
            className="h-12 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] focus:ring-apple-blue"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-[var(--status-error)]">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Sede principale toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--brand)]/5 dark:bg-[var(--brand)]/10 border border-[var(--brand)]/10 dark:border-[var(--brand)]/20">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Sede principale</p>
          <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-0.5">Imposta come sede principale dell&apos;attività</p>
        </div>
        <Switch
          checked={isMain}
          onCheckedChange={(checked: boolean) => setValue('isMain', checked)}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
        <AppleButton
          type="button"
          variant="secondary"
          icon={<X className="h-4 w-4" />}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annulla
        </AppleButton>
        <AppleButton
          type="submit"
          icon={<Save className="h-4 w-4" />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvataggio...' : 'Salva sede'}
        </AppleButton>
      </div>
    </form>
  );
}
